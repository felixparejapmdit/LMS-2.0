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
        const timers = {};
        const mark = (name) => { timers[name] = Date.now() - startTime; };

        try {
            const { department_id, role, user_id } = req.query;
            const normalizedRole = role ? role.toString().toUpperCase().trim() : '';
            
            const isAdmin = ALL_LETTER_ROLES.has(normalizedRole);
            const isSpecificDept = department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined';

            console.log(`[STATS] Dashboard lookup for role: "${normalizedRole}", dept: "${department_id}"`);

            // 1. User & People Stats
            const userWhere = {};
            if (!isAdmin && isSpecificDept) userWhere.dept_id = department_id;
            
            const [onlineUsers, totalUsers, totalPeople] = await Promise.all([
                User.count({ where: { ...userWhere, islogin: true } }),
                User.count({ where: userWhere }),
                Person.count()
            ]);
            mark('UserStats');

            // 2. Base Letter Filter
            const baseLetterWhere = {};
            if (isAdmin) {
                if (isSpecificDept) baseLetterWhere.dept_id = department_id;
            } else if (isSpecificDept) {
                baseLetterWhere[Op.or] = [{ dept_id: department_id }, { dept_id: null }];
            }

            // 3. Counts
            const [activeTasks, archivedTasks, incomingLetters, outgoingLetters] = await Promise.all([
                Letter.count({ where: { ...baseLetterWhere, global_status: [1, 2, 8] } }),
                Letter.count({ where: { ...baseLetterWhere, global_status: 9 } }),
                Letter.count({ where: { ...baseLetterWhere, direction: 'Incoming' } }),
                Letter.count({ where: { ...baseLetterWhere, direction: 'Outgoing' } })
            ]);
            mark('LetterCounts');

            // 4. Detailed Data (Limited)
            const [recentTasks, atgLetters, overdueTasks] = await Promise.all([
                Letter.findAll({
                    where: { ...baseLetterWhere, global_status: 1 },
                    include: [{ model: Status, as: 'status', required: false }, 'letterKind', 'attachment', 'tray'],
                    limit: 5, order: [['created_at', 'DESC']]
                }),
                Letter.findAll({
                    where: { ...baseLetterWhere, global_status: 2 },
                    include: [{ model: Status, as: 'status' }, 'letterKind', 'attachment', 'tray'],
                    limit: 10, order: [['created_at', 'DESC']]
                }),
                Letter.findAll({
                    where: {
                        ...baseLetterWhere,
                        global_status: 8,
                        [Op.or]: [
                            { date_received: { [Op.lt]: new Date(Date.now() - 5 * 86400000) } },
                            { created_at: { [Op.lt]: new Date(Date.now() - 5 * 86400000) } }
                        ]
                    },
                    include: [{ model: Status, as: 'status' }, 'tray'],
                    order: [['created_at', 'ASC']],
                    limit: 10
                })
            ]);
            mark('DetailLists');

            // 5. Recent Log Activity
            const logWhere = {};
            if (isSpecificDept && !isAdmin) {
                logWhere['$Letter.dept_id$'] = { [Op.or]: [department_id, null] };
            }
            const recentActivityLogs = await LetterLog.findAll({
                where: logWhere,
                include: [{ model: User, as: 'user' }, { model: Letter, attributes: ['id', 'lms_id'] }], 
                order: [['timestamp', 'DESC']],
                limit: 8
            }).catch(() => []);
            mark('ActivityLogs');

            // 6. Task Distribution
            const distributionWhere = {};
            if (isSpecificDept) distributionWhere.department_id = department_id;

            const distCounts = await LetterAssignment.findAll({
                where: distributionWhere,
                attributes: [
                    [sequelize.col('step.step_name'), 'step_name'],
                    [sequelize.fn('COUNT', sequelize.col('LetterAssignment.id')), 'count']
                ],
                include: [{ model: ProcessStep, as: 'step', attributes: [], required: true }],
                group: ['step.step_name'],
                raw: true
            });
            const taskDistribution = distCounts.map(d => ({ name: d.step_name, value: Number(d.count) }));
            mark('Distribution');

            console.log(`[STATS] Dashboard complete in ${Date.now() - startTime}ms. Breakdown:`, timers);

            res.json({
                activeTasks, archivedTasks, outgoingLetters, incomingLetters,
                recentTasks, atgLetters, onlineUsers, totalUsers, totalPeople,
                atgLettersCount: atgLetters.length,
                overdueTasks, recentActivityLogs, taskDistribution
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

            // 1. Build Base Filter for Assignments
            const assignmentWhere = {};
            if (normalizedRole === 'USER' && user_id) {
                const visibilityClauses = [{ '$letter.encoder_id$': user_id }];
                if (department_id && department_id !== 'all' && department_id !== 'null' && department_id !== '') {
                    visibilityClauses.push({ department_id });
                }
                assignmentWhere[Op.or] = visibilityClauses;
            } else if (isAdmin) {
                if (department_id && department_id !== 'all' && department_id !== 'null') {
                    assignmentWhere.department_id = department_id;
                }
            } else if (department_id && department_id !== 'all' && department_id !== 'null') {
                assignmentWhere[Op.or] = [{ department_id }, { department_id: null }];
            }

            // 2. Build Base Filter for Letters (Unassigned)
            const letterWhere = { global_status: 1 };
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null') {
                letterWhere[Op.or] = [{ dept_id: department_id }, { dept_id: null }];
            }

            // 3. Parallelize Counts
            const [
                review, signature, atg_note_assigned, atg_note_unassigned, hold, 
                pending_unassigned, vem, avem, empty_assignment, empty_unassigned
            ] = await Promise.all([
                // Review (Step 2)
                LetterAssignment.count({
                    where: { ...assignmentWhere, step_id: 2 },
                    include: [{ model: Letter, as: 'letter', where: { global_status: [1, 8], tray_id: [0, null] }, required: true }]
                }),
                // Signature (Step 1)
                LetterAssignment.count({
                    where: { ...assignmentWhere, step_id: 1 },
                    include: [{ model: Letter, as: 'letter', where: { global_status: [1, 8], tray_id: [0, null] }, required: true }]
                }),
                // ATG Note (Assigned letters with Tray)
                LetterAssignment.count({
                    include: [{ model: Letter, as: 'letter', where: { global_status: 1, tray_id: { [Op.gt]: 0 } }, required: true }],
                    where: assignmentWhere
                }),
                // ATG Note (Unassigned letters with Tray)
                Letter.count({
                    where: { ...letterWhere, tray_id: { [Op.gt]: 0 } },
                    include: [{ model: LetterAssignment, as: 'assignments', required: false }],
                    where: { '$assignments.id$': null }
                }),
                // Hold
                Letter.count({ where: { ...letterWhere, global_status: 7 } }),
                // Pending (Unassigned letters without Tray)
                Letter.count({
                    where: { ...letterWhere, global_status: 1, tray_id: [0, null] },
                    include: [{ model: LetterAssignment, as: 'assignments', required: false }],
                    where: { '$assignments.id$': null }
                }),
                // VEM (Status 8, name contains VEM but not AEVM, not step 1 or 2)
                LetterAssignment.count({
                    where: { 
                        ...assignmentWhere, 
                        step_id: { [Op.notIn]: [1, 2] } 
                    },
                    include: [
                        { model: Letter, as: 'letter', where: { global_status: 8 }, required: true },
                        { model: ProcessStep, as: 'step', where: { step_name: { [Op.like]: '%VEM%', [Op.notLike]: '%AEVM%' } }, required: true }
                    ]
                }),
                // AVEM (Status 8, name contains AEVM, not step 1 or 2)
                LetterAssignment.count({
                    where: { 
                        ...assignmentWhere, 
                        step_id: { [Op.notIn]: [1, 2] } 
                    },
                    include: [
                        { model: Letter, as: 'letter', where: { global_status: 8 }, required: true },
                        { model: ProcessStep, as: 'step', where: { step_name: { [Op.like]: '%AEVM%' } }, required: true }
                    ]
                }),
                // Empty Entry (Assigned)
                LetterAssignment.count({
                    where: assignmentWhere,
                    include: [{ 
                        model: Letter, as: 'letter', 
                        where: { 
                            global_status: { [Op.notIn]: [2, 6, 9] }, // Exclude VIP/ATG (2), Done (6), Filed (9)
                            [Op.or]: [{ sender: [null, ''] }, { summary: [null, ''] }]
                        }, 
                        required: true 
                    }]
                }),
                // Empty Entry (Unassigned)
                Letter.count({
                    where: { 
                        ...letterWhere, 
                        global_status: 1, 
                        tray_id: [0, null],
                        [Op.or]: [{ sender: [null, ''] }, { summary: [null, ''] }]
                    },
                    include: [{ model: LetterAssignment, as: 'assignments', required: false }],
                    where: { '$assignments.id$': null }
                })
            ]);

            console.log(`[STATS] Inbox query for ${normalizedRole} in ${Date.now() - startTime}ms`);

            res.json({
                review,
                signature,
                atg_note: atg_note_assigned + atg_note_unassigned,
                hold,
                pending: pending_unassigned, // Matching original behavior: only purely unassigned are "pending"
                vem,
                avem,
                empty_entry: empty_assignment + empty_unassigned
            });
        } catch (error) {
            console.error("[STATS ERROR]", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = StatsController;
