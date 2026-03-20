const { LetterAssignment, Letter, Status, User, Person, ProcessStep, Tray, sequelize } = require('../models/associations');
const { Op } = require('sequelize');

class StatsController {
    static async getDashboardStats(req, res) {
        try {
            const { department_id } = req.query;
            const where = {};
            if (department_id && department_id !== 'null' && department_id !== 'undefined') {
                where[Op.or] = [
                    { department_id: department_id },
                    { department_id: null }
                ];
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
            const unassignedLettersInDashboard = await Letter.findAll({
                where: {
                    global_status: 1
                },
                include: [{
                    model: LetterAssignment,
                    as: 'assignments',
                    required: false
                }]
            });
            const purelyUnassignedInDashboard = unassignedLettersInDashboard.filter(l => (l.assignments || []).length === 0);
            active += purelyUnassignedInDashboard.length;
            incoming += purelyUnassignedInDashboard.length;

            // Priority Workflow: last 5 Incoming letters (queried directly from letters table
            // so newly received letters without an assignment are also shown)
            const recentTasks = await Letter.findAll({
                where: { global_status: 1 }, // 1 = Incoming
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
            const allPossibleAtg = await LetterAssignment.findAll({
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

            const onlineUsersCount = await User.count({ where: { islogin: true } });
            const totalUsers = await User.count();
            const totalPeople = await Person.count();
            const atgLettersCount = allPossibleAtg.filter(a =>
                a.letter?.global_status === 2 ||
                a.letter?.status?.status_name === 'ATG Note'
            ).length;

            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
            
            const overdueTasks = await Letter.findAll({
                where: { 
                    global_status: 8, // Pending
                    [Op.or]: [
                        { date_received: { [Op.lt]: fiveDaysAgo } },
                        { '$status.status_name$': 'Pending' }
                    ]
                },
                include: [
                    { model: Status, as: 'status' },
                    { model: Tray, as: 'tray' }
                ],
                order: [['date_received', 'ASC']],
                limit: 10
            });
            
            const overdueTasksClean = overdueTasks.filter(l => l.global_status === 8 && new Date(l.date_received || l.created_at) < fiveDaysAgo);

            const { LetterLog } = require('../models/associations');
            
            const recentActivityLogs = await LetterLog.findAll({
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
            const ALL_LETTER_ROLES = new Set([
                'ADMIN', 'ADMINISTRATOR', 'SUPERUSER', 'SUPER USER',
                'SYSTEM ADMIN', 'SYSTEMADMIN', 'SUPER ADMIN', 'SUPERADMIN',
                'DEVELOPER', 'ROOT'
            ]);

            // Role-based filtering identical to LetterAssignmentController
            if (normalizedRole === 'USER' && user_id) {
                const hasValidDepartment = department_id && department_id !== 'null' && department_id !== 'undefined' && department_id !== '';
                const visibilityClauses = [{ '$letter.encoder_id$': user_id }];
                if (hasValidDepartment) {
                    visibilityClauses.push({ department_id: department_id });
                }
                where[Op.or] = visibilityClauses;
            } else if (!ALL_LETTER_ROLES.has(normalizedRole) && department_id && department_id !== 'null' && department_id !== 'undefined') {
                where[Op.or] = [
                    { department_id: department_id },
                    { department_id: null }
                ];
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
            const unassignedLetters = await Letter.findAll({
                where: {
                    global_status: 1
                },
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
