const { LetterAssignment, Letter, Status, User, Person, ProcessStep, Tray, sequelize } = require('../models/associations');
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
            
            console.log(`[STATS] Dashboard lookup for role: "${normalizedRole}", dept: "${department_id}"`);

            // 1. Online & Total Users (Fast Count)
            const userWhere = {};
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                userWhere.dept_id = department_id;
            }
            const [onlineUsers, totalUsers, totalPeople] = await Promise.all([
                User.count({ where: { ...userWhere, islogin: true } }),
                User.count({ where: userWhere }),
                Person.count()
            ]);

            // 2. Letter Counts (Active, Archived, Incoming, Outgoing)
            const baseLetterWhere = {};
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                baseLetterWhere[Op.or] = [
                    { dept_id: department_id },
                    { dept_id: null }
                ];
            }

            const activeStatuses = ['Incoming', 'Review', 'Forwarded', 'Endorsed', 'Pending'];
            
            const [activeTasks, archivedTasks, incomingLetters, outgoingLetters] = await Promise.all([
                // Active: Pending/Incoming statuses
                Letter.count({ 
                    where: { 
                        ...baseLetterWhere,
                        [Op.or]: [
                            { global_status: [1, 8] },
                            { '$status.status_name$': { [Op.in]: activeStatuses } }
                        ]
                    },
                    include: [{ model: Status, as: 'status', required: false }]
                }),
                // Archived: Filed
                Letter.count({ 
                    where: { 
                        ...baseLetterWhere,
                        [Op.or]: [
                            { global_status: 9 },
                            { '$status.status_name$': 'Filed' }
                        ]
                    },
                    include: [{ model: Status, as: 'status', required: false }]
                }),
                // Directional
                Letter.count({ where: { ...baseLetterWhere, direction: 'Incoming' } }),
                Letter.count({ where: { ...baseLetterWhere, direction: 'Outgoing' } })
            ]);

            // 3. Recent Tasks (Workflow Priority)
            const recentTasks = await Letter.findAll({
                where: { ...baseLetterWhere, global_status: 1 },
                include: [{ model: Status, as: 'status' }, 'letterKind', 'attachment', 'tray'],
                limit: 5,
                order: [['created_at', 'DESC']]
            });

            // 4. ATG / VIP Letters
            const atgWhere = {
                [Op.or]: [
                    { global_status: 2 },
                    { '$status.status_name$': 'ATG Note' }
                ]
            };
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                atgWhere[Op.or] = [{ dept_id: department_id }, { dept_id: null }];
            }

            const [atgLetters, atgLettersCount] = await Promise.all([
                Letter.findAll({
                    where: atgWhere,
                    include: [{ model: Status, as: 'status' }, 'letterKind', 'attachment', 'tray'],
                    limit: 10,
                    order: [['created_at', 'DESC']]
                }),
                Letter.count({ where: atgWhere, include: [{ model: Status, as: 'status' }] })
            ]);

            // 5. Overdue Tasks
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
            const overdueTasks = await Letter.findAll({
                where: {
                    ...baseLetterWhere,
                    global_status: 8,
                    date_received: { [Op.lt]: fiveDaysAgo }
                },
                include: [{ model: Status, as: 'status' }, 'tray'],
                order: [['date_received', 'ASC']],
                limit: 10
            });

            // 6. Recent Activity Logs
            const logWhere = {};
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                logWhere['$letter.dept_id$'] = { [Op.or]: [department_id, null] };
            }
            const recentActivityLogs = await LetterLog.findAll({
                where: logWhere,
                include: [{ model: User, as: 'user' }, { model: Letter, as: 'letter' }],
                order: [['timestamp', 'DESC'], ['id', 'DESC']],
                limit: 8
            }).catch(() => []);

            // 7. Task Distribution (Keep current findAll logic as it's complex for step names, but limited to assignments)
            const distributionWhere = {};
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                distributionWhere.department_id = department_id;
            }
            const distAssignments = await LetterAssignment.findAll({
                where: distributionWhere,
                include: [{ model: ProcessStep, as: 'step' }],
                attributes: ['id', 'status_id'],
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
