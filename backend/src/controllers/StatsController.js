const { LetterAssignment, Letter, Status, User, Person, ProcessStep, Tray, sequelize } = require('../models/associations');
const { Op } = require('sequelize');

const ALL_LETTER_ROLES = new Set([
    'ADMIN', 'ADMINISTRATOR', 'SUPERUSER', 'SUPER USER',
    'SYSTEM ADMIN', 'SYSTEMADMIN', 'SUPER ADMIN', 'SUPERADMIN',
    'DEVELOPER', 'ROOT'
]);

class StatsController {
    static async getDashboardStats(req, res) {
        try {
            const { department_id, role, user_id } = req.query;
            const where = {};
            const normalizedRole = role ? role.toString().toUpperCase() : '';

            const isAccessManager = normalizedRole === 'ACCESS MANAGER';
            const isAdmin = ALL_LETTER_ROLES.has(normalizedRole);

            if (isAdmin) {
                if (department_id && department_id !== 'all') {
                    where.department_id = (department_id === 'null' || department_id === 'undefined') ? null : department_id;
                }
            } else if (department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                where[Op.or] = [
                    { department_id: department_id },
                    { department_id: null }
                ];
            } else if (isAccessManager) {
                // If it's an Access Manager but no department_id is passed (though it should be),
                // we still want to limit them if we had their dept_id from session, but for now 
                // we rely on the passed department_id.
            }

            const allAssignments = await LetterAssignment.findAll({
                where,
                include: [
                    {
                        model: Letter,
                        as: 'letter',
                        include: [{ model: Status, as: 'status' }]
                    }
                ]
            });

            let active = 0, archived = 0, outgoing = 0, incoming = 0;
            const activeStatuses = ['Incoming', 'Review', 'Forwarded', 'Endorsed'];

            allAssignments.forEach(a => {
                const statusName = a.letter?.status?.status_name || a.status || '';

                if (statusName === 'Filed') archived++;
                else if (activeStatuses.includes(statusName) || a.status_id === 8 || statusName === 'Pending') active++;

                if (a.letter?.direction === 'Outgoing') outgoing++;
                if (a.letter?.direction === 'Incoming') incoming++;
            });

            // Count letters that are Incoming (global_status=1) but have NO assignment record at all
            // MUST respect department filter for Access Managers
            const unassignedWhere = { global_status: 1 };
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                unassignedWhere[Op.or] = [
                    { dept_id: department_id },
                    { dept_id: null }
                ];
            }

            const unassignedLettersInDashboard = await Letter.findAll({
                where: unassignedWhere,
                include: [{
                    model: LetterAssignment,
                    as: 'assignments',
                    required: false
                }]
            });
            const purelyUnassignedInDashboard = unassignedLettersInDashboard.filter(l => (l.assignments || []).length === 0);
            active += purelyUnassignedInDashboard.length;
            incoming += purelyUnassignedInDashboard.length;

            // Priority Workflow: last 5 Incoming letters
            const recentTasksWhere = { global_status: 1 };
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                recentTasksWhere[Op.or] = [
                    { dept_id: department_id },
                    { dept_id: null }
                ];
            }

            const recentTasks = await Letter.findAll({
                where: recentTasksWhere, // Filter by department
                include: [
                    { model: Status, as: 'status' },
                    'letterKind',
                    'attachment',
                    'tray'
                ],
                limit: 5,
                order: [['created_at', 'DESC']]
            });

            // ATG Letters: Filter manually after fetch to avoid complex join issues in SQLite
            const atgWhere = {};
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                atgWhere[Op.or] = [{ department_id: department_id }, { department_id: null }];
            }

            const allPossibleAtg = await LetterAssignment.findAll({
                where: atgWhere,
                include: [
                    {
                        model: Letter,
                        as: 'letter',
                        where: { tray_id: { [Op.or]: [0, null] } },
                        required: true,
                        include: [{ model: Status, as: 'status', required: false }, 'letterKind', 'attachment', 'tray']
                    },
                    { model: ProcessStep, as: 'step' }
                ],
                order: [['created_at', 'DESC']]
            });

            const atgLetters = allPossibleAtg.filter(a =>
                a.letter?.global_status === 2 ||
                a.letter?.status?.status_name === 'ATG Note'
            ).slice(0, 10);

            const userWhere = {};
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                userWhere.dept_id = department_id;
            }

            const onlineUsersCount = await User.count({ where: { ...userWhere, islogin: true } });
            const totalUsers = await User.count({ where: userWhere });
            const totalPeople = await Person.count();
            const atgLettersCount = allPossibleAtg.filter(a =>
                a.letter?.global_status === 2 ||
                a.letter?.status?.status_name === 'ATG Note'
            ).length;

            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
            
            const overdueWhere = { 
                global_status: 8, // Pending
                [Op.or]: [
                    { date_received: { [Op.lt]: fiveDaysAgo } },
                    { '$status.status_name$': 'Pending' }
                ]
            };
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                overdueWhere[Op.and] = [
                    {
                        [Op.or]: [
                            { dept_id: department_id },
                            { dept_id: null }
                        ]
                    }
                ];
            }

            const overdueTasks = await Letter.findAll({
                where: overdueWhere,
                include: [
                    { model: Status, as: 'status' },
                    { model: Tray, as: 'tray' }
                ],
                order: [['date_received', 'ASC']],
                limit: 10
            });
            
            const overdueTasksClean = overdueTasks.filter(l => l.global_status === 8 && new Date(l.date_received || l.created_at) < fiveDaysAgo);

            const { LetterLog } = require('../models/associations');
            
            const logWhere = {};
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                logWhere['$letter.dept_id$'] = { [Op.or]: [department_id, null] };
            }

            const recentActivityLogs = await LetterLog.findAll({
                where: logWhere,
                include: [
                    { model: User, as: 'user' },
                    { model: Letter }
                ],
                order: [['timestamp', 'DESC'], ['id', 'DESC']],
                limit: 8
            }).catch(() => []); // Fail silently if logs fail

            const distributionMap = {};
            allAssignments.forEach(a => {
                if(a.status === 'Pending' && a.step?.step_name) {
                    distributionMap[a.step.step_name] = (distributionMap[a.step.step_name] || 0) + 1;
                }
            });
            const taskDistribution = Object.entries(distributionMap).map(([name, count]) => ({ name, value: count }));

            res.json({
                activeTasks: active,
                archivedTasks: archived,
                outgoingLetters: outgoing,
                incomingLetters: incoming,
                recentTasks,
                atgLetters,
                onlineUsers: onlineUsersCount,
                totalUsers,
                totalPeople,
                atgLettersCount,
                overdueTasks: overdueTasksClean,
                recentActivityLogs,
                taskDistribution
            });
        } catch (error) {
            console.error('Stats Error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async getInboxStats(req, res) {
        try {
            const { department_id, user_id, role } = req.query;
            const where = {};
            
            const normalizedRole = role ? role.toString().toUpperCase() : '';
            const isAccessManager = normalizedRole === 'ACCESS MANAGER';
            const isAdmin = ALL_LETTER_ROLES.has(normalizedRole);

            // Role-based filtering identical to LetterAssignmentController
            if (normalizedRole === 'USER' && user_id) {
                const hasValidDepartment = department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined' && department_id !== '';
                const visibilityClauses = [{ '$letter.encoder_id$': user_id }];
                if (hasValidDepartment) {
                    visibilityClauses.push({ department_id: department_id });
                }
                where[Op.or] = visibilityClauses;
            } else if (isAdmin) {
                if (department_id && department_id !== 'all') {
                    where.department_id = (department_id === 'null' || department_id === 'undefined') ? null : department_id;
                }
            } else if (department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                where[Op.or] = [
                    { department_id: department_id },
                    { department_id: null }
                ];
            } else if (isAccessManager) {
                // If it's an Access Manager but no department_id is passed, we rely on the frontend
                // but we could also enforce it here if we fetched the user's dept.
            }

            const allAssignments = await LetterAssignment.findAll({
                where,
                include: [
                    { model: Letter, as: 'letter', include: [{ model: Status, as: 'status' }] },
                    { model: ProcessStep, as: 'step' }
                ]
            });

            const reviewStep = await ProcessStep.findByPk(2);
            const signatureStep = await ProcessStep.findByPk(1);
            const reviewName = reviewStep?.step_name || 'For Review';
            const signatureName = signatureStep?.step_name || 'For Signature';

            const counts = { review: 0, atg_note: 0, signature: 0, vem: 0, avem: 0, pending: 0, hold: 0, empty_entry: 0 };

            allAssignments.forEach(a => {
                const stepId = a.step_id;
                const stepName = a.step?.step_name || '';
                const globalStatus = a.letter?.global_status;
                const hasTray = a.letter?.tray_id && a.letter.tray_id > 0;
                
                const isVip = !hasTray && (globalStatus === 2 || a.letter?.status?.status_name === 'ATG Note');

                // For Review
                if ([1, 8].includes(globalStatus) && stepId === 2 && !hasTray && !isVip) counts.review++;
                
                // For Signature
                if ([1, 8].includes(globalStatus) && stepId === 1 && !hasTray && !isVip) counts.signature++;
                
                // VEM
                if (globalStatus === 8 && stepName.includes('VEM') && !stepName.includes('AEVM') && stepId !== 1 && stepId !== 2 && !isVip && globalStatus !== 7) counts.vem++;
                
                // AVEM
                if (globalStatus === 8 && stepName.includes('AEVM') && stepId !== 1 && stepId !== 2 && !isVip && globalStatus !== 7) counts.avem++;
                
                // ATG Note (STRICTLY Incoming (1) and has tray)
                if (globalStatus === 1 && hasTray) counts.atg_note++;
                
                // Pending (from assignments that somehow have no step and global_status 1)
                if (globalStatus === 1 && !stepId && !hasTray && !isVip) counts.pending++;
                
                // Hold
                if (globalStatus === 7 && !isVip) counts.hold++;
                
                // Empty Entry (from assignments)
                if (globalStatus !== 6 && globalStatus !== 9 && !isVip) {
                    const hasNoSenderOrSummary = !a.letter?.sender || a.letter?.sender?.trim() === '' || !a.letter?.summary || a.letter?.summary?.trim() === '';
                    if (hasNoSenderOrSummary) counts.empty_entry++;
                }
            });

            // Count letters that are purely unassigned
            // MUST respect department filter for Access Managers
            const unassignedWhere = { global_status: 1 };
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                unassignedWhere[Op.or] = [
                    { dept_id: department_id },
                    { dept_id: null }
                ];
            }

            const unassignedLetters = await Letter.findAll({
                where: unassignedWhere,
                include: [{
                    model: LetterAssignment,
                    as: 'assignments',
                    required: false
                }]
            });
            const purelyUnassigned = unassignedLetters.filter(l => (l.assignments || []).length === 0);
            purelyUnassigned.forEach(l => {
                const hasTray = l.tray_id && l.tray_id > 0;
                
                if (hasTray) {
                    counts.atg_note++;
                } else {
                    const hasNoSenderOrSummary = !l.sender || l.sender.trim() === '' || !l.summary || l.summary.trim() === '';
                    if (hasNoSenderOrSummary) {
                        counts.empty_entry++;
                    }
                    counts.pending++;
                }
            });

            res.json(counts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = StatsController;
