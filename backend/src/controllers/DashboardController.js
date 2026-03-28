const { LetterAssignment, Letter, Status, Tray, LetterKind, Comment, Endorsement, ProcessStep, Department, sequelize } = require('../models/associations');
const { Op } = require('sequelize');

class DashboardController {
    static async getDashboardInit(req, res) {
        const startTime = Date.now();
        try {
            const { department_id, user_id, role } = req.query;
            console.log(`[DASHBOARD] Init started for role="${role}", dept="${department_id}"`);

            // 1. Fetch Trays (Parallel)
            const traysPromise = Tray.findAll({
                where: (department_id && department_id !== 'all' && department_id !== 'null') ? { dept_id: department_id } : {},
                attributes: ['id', 'tray_name', 'dept_id'],
                raw: true
            });

            // 2. Fetch Stats & Assignments (Parallel)
            const [trays, inboxStats, assignments] = await Promise.all([
                traysPromise,
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
        const normalizedRole = role ? role.toString().toUpperCase() : '';
        const ALL_LETTER_ROLES = new Set(['ADMIN', 'ADMINISTRATOR', 'SUPERUSER', 'SUPER USER', 'SYSTEM ADMIN', 'SYSTEMADMIN', 'SUPER ADMIN', 'SUPERADMIN', 'DEVELOPER', 'ROOT']);
        const isAdmin = ALL_LETTER_ROLES.has(normalizedRole);

        const assignmentWhere = {};
        if (normalizedRole === 'USER' && user_id) {
            assignmentWhere[Op.or] = [{ '$letter.encoder_id$': user_id }];
            if (department_id && department_id !== 'all' && department_id !== 'null') assignmentWhere[Op.or].push({ department_id });
        } else if (department_id && department_id !== 'all' && department_id !== 'null' && !isAdmin) {
            assignmentWhere[Op.or] = [{ department_id }, { department_id: null }];
        }

        const letterWhere = { global_status: 1 };
        if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null') {
            letterWhere[Op.or] = [{ dept_id: department_id }, { dept_id: null }];
        }

        const [review, signature, atg_note_assigned, atg_note_unassigned, hold, pending_unassigned, empty_assignment, empty_unassigned] = await Promise.all([
            LetterAssignment.count({
                where: { ...assignmentWhere, step_id: 2 },
                include: [{ model: Letter, as: 'letter', where: { global_status: [1, 8], tray_id: [0, null] }, required: true }]
            }),
            LetterAssignment.count({
                where: { ...assignmentWhere, step_id: 1 },
                include: [{ model: Letter, as: 'letter', where: { global_status: [1, 8], tray_id: [0, null] }, required: true }]
            }),
            LetterAssignment.count({
                include: [{ model: Letter, as: 'letter', where: { global_status: 1, tray_id: { [Op.gt]: 0 } }, required: true }],
                where: assignmentWhere
            }),
            Letter.count({
                where: { ...letterWhere, tray_id: { [Op.gt]: 0 } },
                include: [{ model: LetterAssignment, as: 'assignments', required: false }],
                where: { '$assignments.id$': null }
            }),
            Letter.count({ where: { ...letterWhere, global_status: 7 } }),
            Letter.count({
                where: { ...letterWhere, global_status: 1, tray_id: [0, null] },
                include: [{ model: LetterAssignment, as: 'assignments', required: false }],
                where: { '$assignments.id$': null }
            }),
            LetterAssignment.count({
                where: assignmentWhere,
                include: [{ model: Letter, as: 'letter', where: { global_status: { [Op.notIn]: [2, 6, 9] }, [Op.or]: [{ sender: [null, ''] }, { summary: [null, ''] }] }, required: true }]
            }),
            Letter.count({
                where: { ...letterWhere, global_status: 1, tray_id: [0, null], [Op.or]: [{ sender: [null, ''] }, { summary: [null, ''] }] },
                include: [{ model: LetterAssignment, as: 'assignments', required: false }],
                where: { '$assignments.id$': null }
            })
        ]);

        return { 
            review, 
            signature, 
            atg_note: atg_note_assigned + atg_note_unassigned, 
            hold, 
            pending: pending_unassigned, 
            empty_entry: empty_assignment + empty_unassigned, 
            vem: 0 
        };
    }

    static async getAssignmentsInternal(query) {
        const { department_id, named_filter, user_id, role } = query;
        const where = {};
        const normalizedRole = role ? role.toString().toUpperCase().trim() : '';
        const ALL_LETTER_ROLES = new Set(['ADMIN', 'ADMINISTRATOR', 'SUPERUSER', 'SUPER USER', 'SYSTEM ADMIN', 'SYSTEMADMIN', 'SUPER ADMIN', 'SUPERADMIN', 'DEVELOPER', 'ROOT']);
        const isAdmin = ALL_LETTER_ROLES.has(normalizedRole);

        if (normalizedRole === 'USER' && user_id) {
            where[Op.or] = [{ '$letter.encoder_id$': user_id }];
            if (department_id && department_id !== 'all' && department_id !== 'null') where[Op.or].push({ department_id });
        } else if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null') {
            where[Op.or] = [{ department_id }, { department_id: null }];
        }

        if (named_filter === 'review') {
            where.step_id = 2;
            where['$letter.global_status$'] = [1, 8];
            where['$letter.tray_id$'] = [0, null];
        } else if (named_filter === 'signature') {
            where.step_id = 1;
            where['$letter.global_status$'] = [1, 8];
            where['$letter.tray_id$'] = [0, null];
        } else if (named_filter === 'atg_note') {
            where['$letter.tray_id$'] = { [Op.gt]: 0 };
            where['$letter.global_status$'] = 1;
        } else if (named_filter === 'hold') {
            where['$letter.global_status$'] = 7;
        }

        return await LetterAssignment.findAll({
            where,
            include: [
                {
                    model: Letter, as: 'letter', required: true,
                    include: [{ model: Status, as: 'status' }, { model: Tray, as: 'tray' }]
                },
                { model: ProcessStep, as: 'step' },
                { model: Department, as: 'department' }
            ],
            limit: 50,
            order: [['created_at', 'DESC']]
        });
    }
}

module.exports = DashboardController;
