const { LetterAssignment, Letter, Status, Tray, LetterKind, Comment, Endorsement, ProcessStep, Department, sequelize } = require('../models/associations');
const { Op } = require('sequelize');

class DashboardController {
    static async getDashboardInit(req, res) {
        const startTime = Date.now();
        try {
            const { department_id, user_id, role, view, named_filter, full_name } = req.query;
            console.log(`[DASHBOARD] Init started for role="${role}", dept="${department_id}"`);

            // 1. Fetch Trays (Parallel)
            const traysPromise = Tray.findAll({
                where: (department_id && department_id !== 'all' && department_id !== 'null') ? { dept_id: department_id } : {}
            });

            // 2. Fetch Stats (Parallel)
            // Reusing logic from StatsController
            const statsPromise = DashboardController.getInboxStatsInternal({ department_id });

            // 3. Fetch Assignments (Main Task)
            // Reusing logic from LetterAssignmentController
            const assignmentsPromise = DashboardController.getAssignmentsInternal(req.query);

            const [trays, inboxStats, assignments] = await Promise.all([
                traysPromise,
                statsPromise,
                assignmentsPromise
            ]);

            console.log(`[DASHBOARD] Init complete in ${Date.now() - startTime}ms`);
            res.json({
                trays,
                inboxStats,
                assignments
            });

        } catch (error) {
            console.error("[DASHBOARD ERROR] Init failed:", error);
            res.status(500).json({ error: error.message });
        }
    }

    // --- Extracted Internal Methods to avoid duplication ---

    static async getInboxStatsInternal({ department_id }) {
        const startTime = Date.now();
        const baseWhere = {};
        if (department_id && department_id !== 'null' && department_id !== 'undefined' && department_id !== '') {
            baseWhere.department_id = department_id;
        }

        // Parallelize counts at the DB level
        const [review, signature, vem, atg_note, hold, empty_entry, pending] = await Promise.all([
            // Review (Step 2, Pending, No Tray)
            LetterAssignment.count({
                where: { ...baseWhere, status: 'Pending', step_id: 2 },
                include: [{ model: Letter, as: 'letter', where: { tray_id: { [Op.or]: [null, 0] }, global_status: { [Op.notIn]: [3, 4] } } }]
            }),
            // Signature (Step 1, Pending, No Tray)
            LetterAssignment.count({
                where: { ...baseWhere, status: 'Pending', step_id: 1 },
                include: [{ model: Letter, as: 'letter', where: { tray_id: { [Op.or]: [null, 0] }, global_status: { [Op.notIn]: [3, 4] } } }]
            }),
            // VEM (VEM code exists)
            LetterAssignment.count({
                where: { ...baseWhere, status: 'Pending' },
                include: [{ model: Letter, as: 'letter', where: { vemcode: { [Op.ne]: null }, global_status: { [Op.notIn]: [3, 4] } } }]
            }),
            // ATG Note (Tray > 0)
            LetterAssignment.count({
                where: baseWhere,
                include: [{ model: Letter, as: 'letter', where: { tray_id: { [Op.gt]: 0 }, global_status: { [Op.notIn]: [3, 4] } } }]
            }),
            // Hold
            LetterAssignment.count({
                where: baseWhere,
                include: [{ model: Letter, as: 'letter', where: { global_status: 7 } }]
            }),
            // Empty Entry (Missing sender or summary)
            Letter.count({
                where: {
                    [Op.and]: [
                        { global_status: { [Op.notIn]: [3, 4] } },
                        { [Op.or]: [{ sender: null }, { sender: '' }, { summary: null }, { summary: '' }] }
                    ],
                    ...(department_id ? { dept_id: department_id } : {})
                }
            }),
            // Purely Unassigned
            Letter.count({
                where: {
                    global_status: 1,
                    tray_id: { [Op.or]: [0, null] },
                    ...(department_id ? { dept_id: department_id } : {})
                },
                include: [{ model: LetterAssignment, as: 'assignments', required: false }],
                // We use a custom where to find letters with NO assignments
                subQuery: false
            })
        ]);

        console.log(`[DASHBOARD_STATS] DB Counts fetched in ${Date.now() - startTime}ms`);

        return { review, atg_note, signature, vem, pending, hold, empty_entry };
    }

    static async getAssignmentsInternal(query) {
        const { department_id, status, named_filter, user_id, role, page = 1, limit = 50 } = query;
        const where = {};
        const normalizedRole = role ? role.toString().toUpperCase().trim() : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const ALL_LETTER_ROLES = new Set(['ADMIN', 'ADMINISTRATOR', 'SUPERUSER', 'SUPER USER', 'SYSTEM ADMIN', 'SYSTEMADMIN', 'SUPER ADMIN', 'SUPERADMIN', 'DEVELOPER', 'ROOT']);

        if (normalizedRole === 'USER' && user_id) {
            where[Op.or] = [{ '$letter.encoder_id$': user_id }];
            if (department_id && department_id !== 'all' && department_id !== 'null') where[Op.or].push({ department_id: department_id });
        } else if (!ALL_LETTER_ROLES.has(normalizedRole) && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined' && query.outbox !== 'true') {
            where.department_id = department_id;
        }

        if (named_filter) {
            if (named_filter === 'review') {
                where[Op.and] = [{ '$letter.status.status_name$': { [Op.notIn]: ['Filed', 'Done'] } }, { step_id: 2 }, { '$letter.tray_id$': { [Op.or]: [null, 0] } }];
            } else if (named_filter === 'signature') {
                where[Op.and] = [{ '$letter.status.status_name$': { [Op.notIn]: ['Filed', 'Done'] } }, { step_id: 1 }, { '$letter.tray_id$': { [Op.or]: [null, 0] } }];
            } else if (named_filter === 'atg_note') {
                where['$letter.tray_id$'] = { [Op.gt]: 0 };
                where[Op.and] = [{ [Op.or]: [{ '$letter.status.status_name$': { [Op.notIn]: ['Filed', 'Done'] } }, { '$letter.status.status_name$': null }] }];
            } else if (named_filter === 'hold') {
                where['$letter.status.status_name$'] = { [Op.or]: ['Hold', 'On Hold'] };
            }
        }

        const assignments = await LetterAssignment.findAll({
            where,
            include: [
                {
                    model: Letter, as: 'letter', required: true,
                    attributes: ['id', 'lms_id', 'entry_id', 'sender', 'summary', 'date_received', 'tray_id', 'scanned_copy', 'vemcode'],
                    include: [
                        { model: Status, as: 'status', attributes: ['id', 'status_name'] },
                        { model: Tray, as: 'tray', attributes: ['id', 'tray_no', 'tray_name'] },
                        { model: LetterKind, as: 'letterKind', attributes: ['id', 'kind_name'] },
                        { model: Comment, as: 'comments', attributes: ['id'], limit: 1, required: false },
                        { model: Endorsement, as: 'endorsements', attributes: ['id', 'endorsed_to'], limit: 3, required: false }
                    ]
                },
                { model: ProcessStep, as: 'step', attributes: ['id', 'step_name'] },
                { model: Department, as: 'department', attributes: ['id', 'dept_name'] }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: offset,
            subQuery: false
        });

        return assignments;
    }
}

module.exports = DashboardController;
