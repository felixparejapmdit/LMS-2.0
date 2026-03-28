const { LetterAssignment, Letter, Status, Tray, LetterKind, Comment, Endorsement, ProcessStep, Department, sequelize } = require('../models/associations');
const { Op } = require('sequelize');

class DashboardController {
    static async getDashboardInit(req, res) {
        const startTime = Date.now();
        try {
            const { department_id, role } = req.query;
            const normalizedRole = role ? role.toString().toUpperCase() : '';

            // Run all heavy data fetches in parallel
            const [trays, inboxStats, assignments] = await Promise.all([
                Tray.findAll({
                    where: (department_id && department_id !== 'all' && department_id !== 'null') ? { dept_id: department_id } : {},
                    attributes: ['id', 'tray_name', 'dept_id'],
                    raw: true
                }),
                DashboardController.getInboxStatsInternal(req.query),
                DashboardController.getAssignmentsInternal(req.query)
            ]);

            console.log(`[DASHBOARD] Init complete in ${Date.now() - startTime}ms`);
            res.json({ trays, inboxStats, assignments });
        } catch (error) {
            console.error("[DASHBOARD ERROR] Init failed:", error);
            res.status(500).json({ error: error.message });
        }
    }

    static async getInboxStatsInternal({ department_id, role, user_id }) {
        const baseWhere = {};
        const normalizedRole = role ? role.toString().toUpperCase() : '';
        
        // Match original visibility logic
        if (department_id && department_id !== 'all' && department_id !== 'null' && normalizedRole !== 'ADMIN') {
            baseWhere[Op.or] = [{ dept_id: department_id }, { dept_id: null }];
        }

        const [review, signature, atg_note, hold, pending, empty_entry] = await Promise.all([
            // Review (Step 2)
            LetterAssignment.count({
                include: [{ model: Letter, as: 'letter', where: { global_status: [1, 8], tray_id: [0, null] }, required: true }],
                where: { ...baseWhere, step_id: 2 }
            }),
            // Signature (Step 1)
            LetterAssignment.count({
                include: [{ model: Letter, as: 'letter', where: { global_status: [1, 8], tray_id: [0, null] }, required: true }],
                where: { ...baseWhere, step_id: 1 }
            }),
            // ATG Note (Status 1 + has Tray)
            Letter.count({
                where: { ...baseWhere, global_status: 1, tray_id: { [Op.gt]: 0 } }
            }),
            // Hold
            Letter.count({
                where: { ...baseWhere, global_status: 7 }
            }),
            // Pending (Global Status 1 + Unassigned)
            Letter.count({
                where: { ...baseWhere, global_status: 1, tray_id: [0, null] },
                include: [{ model: LetterAssignment, as: 'assignments', required: false }],
                where: { '$assignments.id$': null }
            }),
            // Empty Entry (Missing sender/summary)
            Letter.count({
                where: {
                    ...baseWhere,
                    global_status: { [Op.notIn]: [6, 9] },
                    [Op.or]: [
                        { sender: { [Op.or]: [null, ''] } },
                        { summary: { [Op.or]: [null, ''] } }
                    ]
                }
            })
        ]);

        return { review, signature, atg_note, hold, pending, empty_entry, vem: 0 };
    }

    static async getAssignmentsInternal(query) {
        const { department_id, role, user_id, named_filter } = query;
        const where = {};
        const normalizedRole = role ? role.toString().toUpperCase() : '';

        // Visibility Filters
        if (normalizedRole === 'USER' && user_id) {
            where[Op.or] = [{ '$letter.encoder_id$': user_id }];
            if (department_id && department_id !== 'all') where[Op.or].push({ department_id });
        } else if (department_id && department_id !== 'all' && normalizedRole !== 'ADMIN') {
            where[Op.or] = [{ department_id }, { department_id: null }];
        }

        // Apply Named Filter Logic
        if (named_filter === 'review') {
            where.step_id = 2;
            where['$letter.global_status$'] = [1, 8];
        } else if (named_filter === 'signature') {
            where.step_id = 1;
            where['$letter.global_status$'] = [1, 8];
        } else if (named_filter === 'atg_note') {
            where['$letter.tray_id$'] = { [Op.gt]: 0 };
            where['$letter.global_status$'] = 1;
        }

        return await LetterAssignment.findAll({
            where,
            include: [
                {
                    model: Letter, as: 'letter', required: true,
                    include: [{ model: Status, as: 'status', attributes: ['status_name'] }, { model: Tray, as: 'tray', attributes: ['tray_name'] }]
                },
                { model: ProcessStep, as: 'step', attributes: ['step_name'] },
                { model: Department, as: 'department', attributes: ['dept_name'] }
            ],
            attributes: ['id', 'letter_id', 'step_id', 'status', 'created_at'],
            limit: 50,
            order: [['created_at', 'DESC']]
        });
    }
}

module.exports = DashboardController;
