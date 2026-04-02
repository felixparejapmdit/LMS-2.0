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
                if(a.step?.step_name) {
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
        const startTime = Date.now();
        try {
            const { department_id, user_id, role } = req.query;
            const normalizedRole = role ? role.toString().toUpperCase() : '';
            const isAdmin = ALL_LETTER_ROLES.has(normalizedRole);
            
            // Build the base condition for assignments
            let assignmentWhere = "1=1";
            const replacements = {};

            if (normalizedRole === 'USER' && user_id) {
                assignmentWhere = "(a.department_id = :dept_id OR l.encoder_id = :user_id)";
                replacements.dept_id = department_id;
                replacements.user_id = user_id;
            } else if (!isAdmin && department_id && department_id !== 'all') {
                assignmentWhere = "(a.department_id = :dept_id OR a.department_id IS NULL)";
                replacements.dept_id = department_id;
            } else if (isAdmin && department_id && department_id !== 'all') {
                assignmentWhere = "a.department_id = :dept_id";
                replacements.dept_id = department_id;
            }

            // High Performance Aggregate Query
            const statsQuery = `
                SELECT 
                    COUNT(CASE WHEN (l.global_status IN (1, 8) AND a.step_id = 2 AND (l.tray_id IS NULL OR l.tray_id = 0) AND l.global_status != 2) THEN 1 END) as review,
                    COUNT(CASE WHEN (l.global_status IN (1, 8) AND a.step_id = 1 AND (l.tray_id IS NULL OR l.tray_id = 0) AND l.global_status != 2) THEN 1 END) as signature,
                    COUNT(CASE WHEN (l.global_status = 1 AND l.tray_id > 0) THEN 1 END) as atg_note,
                    COUNT(CASE WHEN (l.global_status = 8 AND s.step_name LIKE '%VEM%' AND s.step_name NOT LIKE '%AEVM%' AND a.step_id NOT IN (1, 2)) THEN 1 END) as vem,
                    COUNT(CASE WHEN (l.global_status = 8 AND s.step_name LIKE '%AEVM%' AND a.step_id NOT IN (1, 2)) THEN 1 END) as avem,
                    COUNT(CASE WHEN (l.global_status = 1 AND a.step_id IS NULL AND (l.tray_id IS NULL OR l.tray_id = 0)) THEN 1 END) as pending_assigned,
                    COUNT(CASE WHEN (l.global_status = 7) THEN 1 END) as hold,
                    COUNT(CASE WHEN (l.global_status NOT IN (6, 9) AND (l.sender IS NULL OR l.sender = '' OR l.summary IS NULL OR l.summary = '')) THEN 1 END) as empty_entry_assigned
                FROM letter_assignments a
                JOIN letters l ON a.letter_id = l.id
                LEFT JOIN process_steps s ON a.step_id = s.id
                WHERE ${assignmentWhere}
            `;

            const [assignedStats] = await sequelize.query(statsQuery, { replacements, type: sequelize.QueryTypes.SELECT });

            // Count Purely Unassigned Letters (those without a row in letter_assignments)
            let unassignedWhere = "l.global_status = 1";
            if (!isAdmin && department_id && department_id !== 'all') {
                unassignedWhere += " AND (l.dept_id = :dept_id OR l.dept_id IS NULL)";
            } else if (isAdmin && department_id && department_id !== 'all') {
                unassignedWhere += " AND l.dept_id = :dept_id";
            }

            const unassignedQuery = `
                SELECT 
                    COUNT(CASE WHEN (l.tray_id > 0) THEN 1 END) as unassigned_atg,
                    COUNT(CASE WHEN (l.tray_id IS NULL OR l.tray_id = 0) THEN 1 END) as unassigned_pending,
                    COUNT(CASE WHEN (l.sender IS NULL OR l.sender = '' OR l.summary IS NULL OR l.summary = '') THEN 1 END) as unassigned_empty
                FROM letters l
                LEFT JOIN letter_assignments a ON l.id = a.letter_id
                WHERE a.id IS NULL AND ${unassignedWhere}
            `;

            const [unassignedStats] = await sequelize.query(unassignedQuery, { replacements, type: sequelize.QueryTypes.SELECT });

            const counts = {
                review: assignedStats.review || 0,
                signature: assignedStats.signature || 0,
                atg_note: (assignedStats.atg_note || 0) + (unassignedStats.unassigned_atg || 0),
                vem: assignedStats.vem || 0,
                avem: assignedStats.avem || 0,
                pending: (assignedStats.pending_assigned || 0) + (unassignedStats.unassigned_pending || 0),
                hold: assignedStats.hold || 0,
                empty_entry: (assignedStats.empty_entry_assigned || 0) + (unassignedStats.unassigned_empty || 0)
            };

            console.log(`[STATS] Inbox counts calculated in ${Date.now() - startTime}ms`);
            res.json(counts);
        } catch (error) {
            console.error('[STATS ERROR] Inbox:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = StatsController;
