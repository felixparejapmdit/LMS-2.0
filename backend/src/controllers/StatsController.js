const { LetterAssignment, Letter, Status, User, Person, ProcessStep, Tray, LetterLog, Endorsement, sequelize } = require('../models/associations');
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
            const { department_id, role, user_id, full_name } = req.query;
            const normalizedRole = role ? role.toString().toUpperCase().trim() : '';

            const SUPER_ROLES = ['SUPERUSER', 'SUPER USER', 'SYSTEM ADMIN', 'SYSTEMADMIN', 'SUPER ADMIN', 'SUPERADMIN', 'DEVELOPER', 'ROOT'];
            const isSuperAdmin = SUPER_ROLES.includes(normalizedRole);
            const isAdmin = isSuperAdmin || ['ADMINISTRATOR', 'ADMIN'].includes(normalizedRole);

            console.log(`[STATS] Dashboard lookup for role: "${normalizedRole}", dept: "${department_id}", name: "${full_name}"`);

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

            // 2. Base Letter Filter (Now includes name-based visibility)
            const baseLetterWhere = {};
            const isValidId = (id) => id && id !== 'all' && id !== 'null' && id !== 'undefined' && id !== '';
            const isSpecificDept = isValidId(department_id);

            // Fetch user's department for secure filtering
            const userRecord = user_id ? await User.findByPk(user_id) : null;
            const myDeptId = userRecord?.dept_id;

            const visibilityClauses = [];
            
            // 2. Department-based Visibility (Restrictive: Shared Work = Same Role + Same Dept)
            const getSharedWorkSql = (d, r) => `EXISTS (
                SELECT 1 FROM directus_users colleagues 
                LEFT JOIN directus_roles dr ON colleagues.role = dr.id
                WHERE colleagues.dept_id = ${sequelize.escape(d)} 
                AND (colleagues.role = ${sequelize.escape(r)} OR dr.name = ${sequelize.escape(r)})
                AND (
                    colleagues.id IN (Letter.encoder_id, Letter.sender, Letter.endorsed)
                    OR (colleagues.first_name || ' ' || colleagues.last_name) = Letter.sender
                    OR (colleagues.first_name || ' ' || colleagues.last_name) = Letter.endorsed
                )
            )`;

            if (isSpecificDept) {
                // If they specifically requested a department, only allow if it's THEIR department or they are Super Admin
                if (isSuperAdmin || department_id == myDeptId) {
                    visibilityClauses.push(sequelize.literal(getSharedWorkSql(department_id, role)));
                    
                    // Also check assignments
                    visibilityClauses.push(sequelize.literal(`EXISTS (
                        SELECT 1 FROM letter_assignments la 
                        JOIN directus_users colleagues ON (colleagues.id IN (Letter.encoder_id, Letter.sender, Letter.endorsed) OR (colleagues.first_name || ' ' || colleagues.last_name) = Letter.sender OR (colleagues.first_name || ' ' || colleagues.last_name) = Letter.endorsed)
                        LEFT JOIN directus_roles dr ON colleagues.role = dr.id
                        WHERE la.letter_id = Letter.id 
                        AND la.department_id = ${sequelize.escape(department_id)} 
                        AND colleagues.dept_id = ${sequelize.escape(department_id)}
                        AND (colleagues.role = ${sequelize.escape(role)} OR dr.name = ${sequelize.escape(role)})
                    )`));
                }
            } else if (isAdmin && !isSuperAdmin) {
                // Viewing "all" — restricted to Shared Work in their own department
                if (myDeptId) {
                    visibilityClauses.push(sequelize.literal(getSharedWorkSql(myDeptId, role)));
                    
                    visibilityClauses.push(sequelize.literal(`EXISTS (
                        SELECT 1 FROM letter_assignments la 
                        JOIN directus_users colleagues ON (colleagues.id IN (Letter.encoder_id, Letter.sender, Letter.endorsed) OR (colleagues.first_name || ' ' || colleagues.last_name) = Letter.sender OR (colleagues.first_name || ' ' || colleagues.last_name) = Letter.endorsed)
                        LEFT JOIN directus_roles dr ON colleagues.role = dr.id
                        WHERE la.letter_id = Letter.id 
                        AND la.department_id = ${sequelize.escape(myDeptId)} 
                        AND colleagues.dept_id = ${sequelize.escape(myDeptId)}
                        AND (colleagues.role = ${sequelize.escape(role)} OR dr.name = ${sequelize.escape(role)})
                    )`));
                }
            }

            if (user_id) {
                // Involvements (Always Visible)
                visibilityClauses.push({ encoder_id: user_id });
                visibilityClauses.push({ sender: user_id });
                visibilityClauses.push({ endorsed: user_id });
                
                if (full_name) {
                    const nameParts = full_name.split(' ').filter(p => p.length > 0);
                    const nameMatches = [`%${full_name}%`];
                    if (nameParts.length >= 2) {
                        nameMatches.push(`%${nameParts[nameParts.length - 1]}, ${nameParts[0]}%`);
                    }
                    
                    nameMatches.forEach(match => {
                        visibilityClauses.push({ sender: { [Op.like]: match } });
                        visibilityClauses.push({ endorsed: { [Op.like]: match } });
                        visibilityClauses.push(sequelize.literal(`EXISTS (SELECT 1 FROM endorsements e WHERE e.letter_id = Letter.id AND e.endorsed_to LIKE ${sequelize.escape(match)})`));
                    });
                }
            }

            if (visibilityClauses.length > 0) {
                baseLetterWhere[Op.or] = visibilityClauses;
            } else if (!isSuperAdmin) {
                baseLetterWhere.id = null;
            }

            const activeStatuses = ['Incoming', 'Review', 'Forwarded', 'Endorsed', 'Pending'];

            // 3. Optimized SQL Counts
            const [activeTasks, archivedTasks, incomingLetters, outgoingLetters] = await Promise.all([
                Letter.count({
                    where: { ...baseLetterWhere, global_status: [1, 2, 8] },
                    distinct: true,
                    col: 'id'
                }),
                Letter.count({
                    where: { ...baseLetterWhere, global_status: 9 },
                    distinct: true,
                    col: 'id'
                }),
                Letter.count({ 
                    where: { ...baseLetterWhere, direction: 'Incoming' },
                    distinct: true,
                    col: 'id'
                }),
                Letter.count({ 
                    where: { ...baseLetterWhere, direction: 'Outgoing' },
                    distinct: true,
                    col: 'id'
                })
            ]);

            // 4. Priority Workflow Letters (Incoming only)
            const recentTasks = await Letter.findAll({
                where: { ...baseLetterWhere, global_status: 1 },
                include: [
                    { model: Status, as: 'status', required: false }, 
                    'letterKind', 
                    'attachment', 
                    'tray'
                ],
                limit: 5,
                order: [['created_at', 'DESC']],
                distinct: true
            });

            // 5. ATG Note / VIP Letters (Status 2 OR 'ATG Note')
            const atgWhere = {
                ...baseLetterWhere,
                global_status: 2
            };

            const [atgLetters, atgLettersCount] = await Promise.all([
                Letter.findAll({
                    where: atgWhere,
                    include: [
                        { model: Status, as: 'status' }, 
                        'letterKind', 
                        'attachment', 
                        'tray'
                    ],
                    limit: 10,
                    order: [['created_at', 'DESC']],
                    distinct: true
                }),
                Letter.count({ 
                    where: atgWhere,
                    distinct: true,
                    col: 'id'
                })
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
                include: [
                    { model: Status, as: 'status' }, 
                    'tray'
                ],
                order: [['date_received', 'ASC']],
                limit: 10,
                distinct: true
            });

            // 7. Recent Log Activity
            const logWhere = {};
            if (isSpecificDept && !isAdmin) {
                logWhere['$Letter.dept_id$'] = department_id;
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
            const { department_id, user_id, role, full_name } = req.query;
            const where = {};
            const normalizedRole = role ? role.toString().toUpperCase().trim() : '';
            const isValidId = (id) => id && id !== 'all' && id !== 'null' && id !== 'undefined' && id !== '';
            const isSpecificDept = isValidId(department_id);
            const SUPER_ROLES = ['SUPERUSER', 'SUPER USER', 'SYSTEM ADMIN', 'SYSTEMADMIN', 'SUPER ADMIN', 'SUPERADMIN', 'DEVELOPER', 'ROOT'];
            const isSuperAdmin = SUPER_ROLES.includes(normalizedRole);
            const isAdmin = isSuperAdmin || ['ADMINISTRATOR', 'ADMIN'].includes(normalizedRole);

            // Fetch user's department for secure filtering
            const userRecord = user_id ? await User.findByPk(user_id) : null;
            const myDeptId = userRecord?.dept_id;

            const visibilityClauses = [];

            if (user_id) {
                // Involvement-based (Always Visible)
                visibilityClauses.push({ '$letter.encoder_id$': user_id });
                visibilityClauses.push({ '$letter.sender$': user_id });
                visibilityClauses.push({ '$letter.endorsed$': user_id });
                
                if (full_name) {
                    const nameParts = full_name.split(' ').filter(p => p.length > 0);
                    const nameMatches = [`%${full_name}%`];
                    if (nameParts.length >= 2) {
                        nameMatches.push(`%${nameParts[nameParts.length - 1]}, ${nameParts[0]}%`);
                    }
                    nameMatches.forEach(match => {
                        visibilityClauses.push({ '$letter.sender$': { [Op.like]: match } });
                        visibilityClauses.push({ '$letter.endorsed$': { [Op.like]: match } });
                        visibilityClauses.push(sequelize.literal(`EXISTS (SELECT 1 FROM endorsements e WHERE e.letter_id = LetterAssignment.letter_id AND e.endorsed_to LIKE ${sequelize.escape(match)})`));
                    });
                }
            }

            // 2. Department-based Visibility (Restrictive: Shared Work = Same Role + Same Dept)
            const getSharedWorkSqlInbox = (d, r) => `EXISTS (
                SELECT 1 FROM directus_users colleagues 
                JOIN letters l ON l.id = LetterAssignment.letter_id
                LEFT JOIN directus_roles dr ON colleagues.role = dr.id
                WHERE colleagues.dept_id = ${sequelize.escape(d)} 
                AND (colleagues.role = ${sequelize.escape(r)} OR dr.name = ${sequelize.escape(r)})
                AND (
                    colleagues.id IN (l.encoder_id, l.sender, l.endorsed)
                    OR (colleagues.first_name || ' ' || colleagues.last_name) = l.sender
                    OR (colleagues.first_name || ' ' || colleagues.last_name) = l.endorsed
                )
            )`;

            if (isSpecificDept) {
                // Only allow department stats if it's THEIR department or they are Super Admin
                if (isSuperAdmin || department_id == myDeptId) {
                    visibilityClauses.push(sequelize.literal(getSharedWorkSqlInbox(department_id, role)));
                }
            } else if (isAdmin && !isSuperAdmin) {
                // Viewing "all" — restricted to Shared Work in their own department
                if (myDeptId) {
                    visibilityClauses.push(sequelize.literal(getSharedWorkSqlInbox(myDeptId, role)));
                }
            }

            if (visibilityClauses.length > 0) {
                where[Op.or] = visibilityClauses;
            } else if (!isSuperAdmin) {
                where.id = null;
            }

            const allAssignments = await LetterAssignment.findAll({
                where,
                include: [
                    { 
                        model: Letter, 
                        as: 'letter', 
                        include: [
                            { model: Status, as: 'status' },
                            { model: Endorsement, as: 'endorsements' }
                        ] 
                    },
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
            if (isSpecificDept && !isSuperAdmin) {
                unassignedWhere[Op.and] = [
                    sequelize.literal(`EXISTS (
                        SELECT 1 FROM directus_users colleagues 
                        LEFT JOIN directus_roles dr ON colleagues.role = dr.id
                        WHERE colleagues.dept_id = ${sequelize.escape(department_id)} 
                        AND (colleagues.role = ${sequelize.escape(role)} OR dr.name = ${sequelize.escape(role)})
                        AND (
                            colleagues.id IN (Letter.encoder_id, Letter.sender, Letter.endorsed)
                            OR (colleagues.first_name || ' ' || colleagues.last_name) = Letter.sender
                            OR (colleagues.first_name || ' ' || colleagues.last_name) = Letter.endorsed
                        )
                    )`)
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