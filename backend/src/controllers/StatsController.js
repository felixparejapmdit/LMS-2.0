const { LetterAssignment, Letter, Status, User, Person, ProcessStep, Tray, LetterLog, sequelize } = require('../models/associations');
const { Op } = require('sequelize');

const ALL_LETTER_ROLES = new Set([
    'ADMIN', 'ADMINISTRATOR', 'SUPERUSER', 'SUPER USER',
    'SYSTEM ADMIN', 'SYSTEMADMIN', 'SUPER ADMIN', 'SUPERADMIN',
    'DEVELOPER', 'ROOT'
]);

class StatsController {
    static async getDashboardStats(req, res) {
        const startTime = Date.now();
        try {
            const { department_id, role, user_id } = req.query;
            const normalizedRole = role ? role.toString().toUpperCase().trim() : '';
            const isAdmin = ALL_LETTER_ROLES.has(normalizedRole);
            const isAccessManager = normalizedRole === 'ACCESS MANAGER';

            console.log(`[STATS] Dashboard lookup for role: "${normalizedRole}", dept: "${department_id}"`);

            // 1. User & People Stats (Fast)
            const userWhere = {};
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                userWhere.dept_id = department_id;
            }
            const [onlineUsers, totalUsers, totalPeople] = await Promise.all([
                User.count({ where: { ...userWhere, islogin: true } }),
                User.count({ where: userWhere }),
                Person.count()
            ]);

            // 2. Base Letter Filter (Matches your original Department logic)
            const baseLetterWhere = {};
            const isSpecificDept = department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined';

            if (isAdmin) {
                // Admins only filter if they explicitly select a department
                if (isSpecificDept) baseLetterWhere.dept_id = department_id;
            } else if (isSpecificDept) {
                // Others (like Access Managers) only see their department OR system entries
                baseLetterWhere[Op.or] = [{ dept_id: department_id }, { dept_id: null }];
            }

            const activeStatuses = ['Incoming', 'Review', 'Forwarded', 'Endorsed', 'Pending'];

            // 3. Optimized SQL Counts (Simplified for SQLite compatibility)
            const [activeTasks, archivedTasks, incomingLetters, outgoingLetters] = await Promise.all([
                // Active Tasks: global_status 1 (Incoming), 8 (Pending), 2 (ATG)
                Letter.count({
                    where: {
                        ...baseLetterWhere,
                        global_status: [1, 2, 8]
                    }
                }),
                // Archived Tasks: global_status 9 (Filed)
                Letter.count({
                    where: {
                        ...baseLetterWhere,
                        global_status: 9
                    }
                }),
                Letter.count({ where: { ...baseLetterWhere, direction: 'Incoming' } }),
                Letter.count({ where: { ...baseLetterWhere, direction: 'Outgoing' } })
            ]);

            // 4. Priority Workflow Letters (Incoming only)
            const recentTasks = await Letter.findAll({
                where: { ...baseLetterWhere, global_status: 1 },
                include: [{ model: Status, as: 'status', required: false }, 'letterKind', 'attachment', 'tray'],
                limit: 5,
                order: [['created_at', 'DESC']]
            });

            // 5. ATG Note / VIP Letters (Status 2 OR 'ATG Note')
            const atgWhere = {
                ...baseLetterWhere,
                global_status: 2
            };

            const [atgLetters, atgLettersCount] = await Promise.all([
                Letter.findAll({
                    where: atgWhere,
                    include: [{ model: Status, as: 'status' }, 'letterKind', 'attachment', 'tray'],
                    limit: 10,
                    order: [['created_at', 'DESC']]
                }),
                Letter.count({ where: atgWhere })
            ]);

            // 6. Overdue (Older than 5 days AND Pending)
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
            const overdueTasks = await Letter.findAll({
                where: {
                    ...baseLetterWhere,
                    global_status: 8,
                    [Op.or]: [
                        { date_received: { [Op.lt]: fiveDaysAgo } },
                        { created_at: { [Op.lt]: fiveDaysAgo } }
                    ]
                },
                include: [{ model: Status, as: 'status' }, 'tray'],
                order: [['date_received', 'ASC']],
                limit: 10
            });

            // 7. Recent Log Activity
            const logWhere = {};
            if (isSpecificDept && !isAdmin) {
                logWhere['$Letter.dept_id$'] = { [Op.or]: [department_id, null] };
            }
            const recentActivityLogs = await LetterLog.findAll({
                where: logWhere,
                include: [
                    { model: User, as: 'user' },
                    { model: Letter } // Removed "as: 'letter'" because it's not aliased in associations.js
                ],
                order: [['timestamp', 'DESC'], ['id', 'DESC']],
                limit: 8
            }).catch((err) => {
                console.error("[STATS LOG ERROR]", err.message);
                return [];
            });

            // 8. Task Distribution Map
            const distributionWhere = {};
            if (isSpecificDept) distributionWhere.department_id = department_id;

            const distAssignments = await LetterAssignment.findAll({
                where: distributionWhere,
                attributes: ['id'],
                include: [{ model: ProcessStep, as: 'step', attributes: ['step_name'] }]
            });
            const distributionMap = {};
            distAssignments.forEach(a => {
                if (a.step?.step_name) {
                    distributionMap[a.step.step_name] = (distributionMap[a.step.step_name] || 0) + 1;
                }
            });
            const taskDistribution = Object.entries(distributionMap).map(([name, count]) => ({ name, value: count }));

            console.log(`[STATS] Dashboard metrics optimized for ${normalizedRole} in ${Date.now() - startTime}ms`);

            res.json({
                activeTasks,
                archivedTasks,
                outgoingLetters,
                incomingLetters,
                recentTasks,
                atgLetters,
                onlineUsers,
                totalUsers,
                totalPeople,
                atgLettersCount,
                overdueTasks,
                recentActivityLogs,
                taskDistribution
            });
        } catch (error) {
            console.error('[STATS ERROR] Dashboard:', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async getInboxStats(req, res) {
        try {
            const { department_id, role } = req.query;
            const baseWhere = {};
            if (department_id && department_id !== 'all' && department_id !== 'null') {
                baseWhere[Op.or] = [{ dept_id: department_id }, { dept_id: null }];
            }

            // High-speed parallelized counts
            const [review, signature, atg_note, hold, pending, empty_entry] = await Promise.all([
                LetterAssignment.count({
                    include: [{ model: Letter, as: 'letter', where: { global_status: [1, 8], tray_id: [0, null] }, required: true }],
                    where: { ...baseWhere, step_id: 2 }
                }),
                LetterAssignment.count({
                    include: [{ model: Letter, as: 'letter', where: { global_status: [1, 8], tray_id: [0, null] }, required: true }],
                    where: { ...baseWhere, step_id: 1 }
                }),
                Letter.count({
                    where: { ...baseWhere, global_status: 1, tray_id: { [Op.gt]: 0 } }
                }),
                Letter.count({
                    where: { ...baseWhere, global_status: 7 }
                }),
                Letter.count({
                    where: { ...baseWhere, global_status: 1, tray_id: [0, null] },
                    include: [{ model: LetterAssignment, as: 'assignments', required: false }],
                    where: { '$assignments.id$': null }
                }),
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

            res.json({ review, signature, atg_note, hold, pending, empty_entry, vem: 0, avem: 0 });
        } catch (error) {
            console.error("[STATS ERROR]", error.message);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = StatsController;
