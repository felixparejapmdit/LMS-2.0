const { LetterAssignment, Letter, Status, User, Person, ProcessStep, Tray, LetterLog, Endorsement, Role, Department, sequelize } = require('../models/associations');
const { Op } = require('sequelize');

const ALL_LETTER_ROLES = new Set(['ADMINISTRATOR']);

class StatsController {
    static async getDashboardStats(req, res) {
        const startTime = Date.now();
        try {
            const { department_id, user_id, role, full_name: queryFullName } = req.query;
            const userRecord = user_id ? await User.findByPk(user_id, {
                include: [{ model: Role, as: 'roleData' }]
            }) : null;

            const myDeptId = userRecord?.dept_id;
            const actualRoleName = userRecord?.roleData?.name || role;
            const full_name = userRecord ? `${userRecord.first_name || ''} ${userRecord.last_name || ''}`.trim() : queryFullName;

            const normalizedRole = actualRoleName ? actualRoleName.toString().toUpperCase().trim() : '';
            const SUPER_ROLES = ['ADMINISTRATOR', 'ADMIN', 'VIP'];
            const isSuperAdmin = SUPER_ROLES.includes(normalizedRole);
            const isAdmin = isSuperAdmin || SUPER_ROLES.includes(normalizedRole);
            const isSpecificDept = department_id && department_id !== 'all' && department_id !== 'null';

            console.log(`[STATS] Dashboard lookup for role: "${normalizedRole}", dept: "${department_id}", name: "${full_name}"`);

            // 1. User & People Stats (Fast)
            const userWhere = {};
            if (!isAdmin && department_id && department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') {
                userWhere.dept_id = department_id;
            }
            const [onlineUsers, totalUsers, totalPeople, totalDepartments] = await Promise.all([
                User.count({ where: { ...userWhere, islogin: true } }),
                User.count({ where: userWhere }),
                Person.count(),
                Department.count()
            ]);

            // 2. Base Letter Filter (Now includes name-based visibility)
            const baseLetterWhere = {};
            const visibilityClauses = [];
            
            // 2. Department-based Visibility
            if (isSuperAdmin) {
                // Admins see everything globally
                visibilityClauses.push(sequelize.literal('1=1'));
            } else if (isAdmin && myDeptId) {
                // Optimized departmental visibility
                // Instead of multiple EXISTS, we use OR clauses that leverage indexes
                if (!isSpecificDept || department_id == myDeptId) {
                    const deptIdStr = String(myDeptId);
                    visibilityClauses.push({ dept_id: deptIdStr });
                    
                    // Pre-fetch dept user IDs to avoid slow per-row subqueries where possible
                    const deptUserIds = await User.findAll({ 
                        where: { dept_id: myDeptId }, 
                        attributes: ['id'], 
                        raw: true 
                    }).then(users => users.map(u => u.id));

                    if (deptUserIds.length > 0) {
                        visibilityClauses.push({ encoder_id: { [Op.in]: deptUserIds } });
                        visibilityClauses.push({ sender: { [Op.in]: deptUserIds } });
                        visibilityClauses.push({ endorsed: { [Op.in]: deptUserIds } });
                    }

                    // Fallback for name-based matching in the department
                    visibilityClauses.push(sequelize.literal(`EXISTS (
                        SELECT 1 FROM directus_users du
                        WHERE du.dept_id = ${sequelize.escape(deptIdStr)}
                        AND (
                            Letter.sender LIKE ('%' || du.first_name || '%')
                            OR Letter.sender LIKE ('%' || du.last_name || '%')
                            OR Letter.endorsed LIKE ('%' || du.first_name || '%')
                            OR Letter.endorsed LIKE ('%' || du.last_name || '%')
                        )
                    )`));
                    
                    visibilityClauses.push(sequelize.literal(`EXISTS (SELECT 1 FROM letter_assignments la WHERE la.letter_id = Letter.id AND la.department_id = ${sequelize.escape(deptIdStr)})`));
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

            // 3. Dynamic Status Mapping
            const allStatuses = await Status.findAll({ attributes: ['id', 'status_name'], raw: true });
            const statusMap = allStatuses.reduce((acc, s) => {
                acc[s.status_name.toUpperCase()] = s.id;
                return acc;
            }, {});

            const activeStatusIds = [
                statusMap['INCOMING'], 
                statusMap['ATG NOTE'], 
                statusMap['REVIEW'], 
                statusMap['FORWARDED'], 
                statusMap['HOLD'], 
                statusMap['PENDING'],
                statusMap['RECEIVED'], // Alignment with seed data
                statusMap['PROCESSING'], // Alignment with seed data
                1, 2, 7, 8 // Fallback hardcoded IDs
            ].filter(id => id != null);

            const processedStatusIds = [
                statusMap['FILED'], 
                statusMap['ENDORSED'], 
                statusMap['ARCHIVED'], // Alignment with seed data
                9, 10 // Fallback hardcoded IDs
            ].filter(id => id != null);

            // 4. Optimized SQL Counts
            const [activeTasks, archivedTasks, incomingLetters, outgoingLetters] = await Promise.all([
                Letter.count({
                    where: { ...baseLetterWhere, global_status: activeStatusIds },
                    distinct: true,
                    col: 'id'
                }),
                Letter.count({
                    where: { ...baseLetterWhere, global_status: processedStatusIds },
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

            // 5. Priority Workflow Letters (Incoming only)
            const recentTasks = await Letter.findAll({
                where: { ...baseLetterWhere, global_status: statusMap['INCOMING'] || 1 },
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

            // 6. ATG Note / VIP Letters (Status 2 ONLY AND No Tray)
            const atgWhere = {
                ...baseLetterWhere,
                global_status: 2,
                tray_id: { [Op.or]: [0, null] }
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

            // 7. Overdue (Older than 5 days AND Pending)
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
            const overdueTasks = await Letter.findAll({
                where: {
                    ...baseLetterWhere,
                    global_status: statusMap['PENDING'] || 8,
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

            // 8. Task Distribution Map (by Step)
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

            // 9. Status Distribution Map (by Global Status)
            const allLettersForStats = await Letter.findAll({
                where: baseLetterWhere,
                attributes: ['id', 'global_status'],
                include: [{ model: Status, as: 'status', attributes: ['status_name'] }]
            });

            const statusCountMap = {};
            allLettersForStats.forEach(l => {
                const name = l.status?.status_name || 'Draft/Unknown';
                statusCountMap[name] = (statusCountMap[name] || 0) + 1;
            });

            const statusDistribution = Object.entries(statusCountMap).map(([name, count]) => ({
                name,
                value: count
            })).filter(d => d.value > 0);

            console.log(`[STATS] Dashboard status distribution: ${statusDistribution.length} statuses found. Total letters: ${allLettersForStats.length}, Depts: ${totalDepartments}`);

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
                totalDepartments,
                atgLettersCount,
                overdueTasks,
                recentActivityLogs,
                taskDistribution,
                statusDistribution
            });
        } catch (error) {
            console.error('[STATS ERROR] Dashboard:', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async getInboxStats(req, res) {
        try {
            const { department_id, user_id, role, full_name: queryFullName } = req.query;
            const where = {};
            
            const userRecord = user_id ? await User.findByPk(user_id, {
                include: [{ model: Role, as: 'roleData' }]
            }) : null;

            const myDeptId = userRecord?.dept_id;
            const actualRoleName = userRecord?.roleData?.name || role;
            const full_name = userRecord ? `${userRecord.first_name || ''} ${userRecord.last_name || ''}`.trim() : queryFullName;

            const normalizedRole = actualRoleName ? actualRoleName.toString().toUpperCase().trim() : '';
            const SUPER_ROLES = ['ADMINISTRATOR', 'ADMIN', 'VIP'];
            const isSuperAdmin = SUPER_ROLES.includes(normalizedRole);
            const isAdmin = isSuperAdmin || SUPER_ROLES.includes(normalizedRole);
            const isValidId = (id) => id && id !== 'all' && id !== 'null' && id !== 'undefined' && id !== '';
            const isSpecificDept = isValidId(department_id);

            const incomingStatus = await Status.findOne({
                where: { status_name: 'Incoming' },
                attributes: ['id'],
                raw: true
            });
            const incomingStatusId = incomingStatus?.id ?? null;

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

            // 2. Department-based Visibility
            if (isSuperAdmin) {
                // Admins see everything globally
                visibilityClauses.push(sequelize.literal('1=1'));
            } else if (isAdmin && myDeptId) {
                // Specific department filter requested OR default to user's department
                const targetDeptId = isSpecificDept ? department_id : myDeptId;
                const targetDeptIdStr = String(targetDeptId);
                
                visibilityClauses.push({ department_id: targetDeptIdStr });

                // Pre-fetch dept user IDs to leverage indexes instead of slow subqueries
                const deptUserIds = await User.findAll({ 
                    where: { dept_id: targetDeptId }, 
                    attributes: ['id'], raw: true 
                }).then(users => users.map(u => u.id));

                if (deptUserIds.length > 0) {
                    visibilityClauses.push(sequelize.literal(`EXISTS (
                        SELECT 1 FROM letters l 
                        WHERE l.id = LetterAssignment.letter_id 
                        AND (l.encoder_id IN (${deptUserIds.map(id => sequelize.escape(id)).join(',')}) 
                             OR l.sender IN (${deptUserIds.map(id => sequelize.escape(id)).join(',')}) 
                             OR l.endorsed IN (${deptUserIds.map(id => sequelize.escape(id)).join(',')}))
                    )`));
                }

                // Fallback for name-based matching
                visibilityClauses.push(sequelize.literal(`EXISTS (
                    SELECT 1 FROM directus_users du
                    JOIN letters l ON l.id = LetterAssignment.letter_id
                    WHERE du.dept_id = ${sequelize.escape(targetDeptIdStr)}
                    AND (
                        (du.first_name || ' ' || du.last_name) = l.sender
                        OR (du.first_name || ' ' || du.last_name) = l.endorsed
                    )
                )`));
            }

            if (visibilityClauses.length > 0) {
                where[Op.or] = visibilityClauses;
            } else if (!isSuperAdmin) {
                where.id = null;
            }

            // 2.5 Prepare visibility for unassigned letters (pure letters)
            const unassignedWhere = { global_status: [1, 2, 8] };
            const unassignedVisibilityClauses = [];

            if (user_id) {
                unassignedVisibilityClauses.push({ encoder_id: user_id });
                unassignedVisibilityClauses.push({ sender: user_id });
                unassignedVisibilityClauses.push({ endorsed: user_id });
                
                if (full_name) {
                    const nameParts = full_name.split(' ').filter(p => p.length > 0);
                    const nameMatches = [`%${full_name}%`];
                    if (nameParts.length >= 2) {
                        nameMatches.push(`%${nameParts[nameParts.length - 1]}, ${nameParts[0]}%`);
                    }
                    nameMatches.forEach(match => {
                        unassignedVisibilityClauses.push({ sender: { [Op.like]: match } });
                        unassignedVisibilityClauses.push({ endorsed: { [Op.like]: match } });
                        unassignedVisibilityClauses.push(sequelize.literal(`EXISTS (SELECT 1 FROM endorsements e WHERE e.letter_id = Letter.id AND e.endorsed_to LIKE ${sequelize.escape(match)})`));
                    });
                }
            }

            if (isSuperAdmin) {
                unassignedVisibilityClauses.push(sequelize.literal('1=1'));
            } else if (isAdmin) {
                if (myDeptId) {
                    const targetDeptId = isSpecificDept ? department_id : myDeptId;
                    unassignedVisibilityClauses.push({
                        [Op.or]: [
                            { dept_id: String(targetDeptId) },
                            { dept_id: { [Op.or]: [null, 0] } } 
                        ]
                    });
                    unassignedVisibilityClauses.push(sequelize.literal(`EXISTS (
                        SELECT 1 FROM directus_users du
                        WHERE du.dept_id = ${sequelize.escape(String(targetDeptId))}
                        AND (
                            du.id = Letter.encoder_id
                            OR du.id = Letter.sender
                            OR du.id = Letter.endorsed
                            OR Letter.sender LIKE ('%' || du.first_name || '%')
                            OR Letter.sender LIKE ('%' || du.last_name || '%')
                            OR Letter.endorsed LIKE ('%' || du.first_name || '%')
                            OR Letter.endorsed LIKE ('%' || du.last_name || '%')
                        )
                    )`));
                }
            }

            if (unassignedVisibilityClauses.length > 0) {
                unassignedWhere[Op.or] = unassignedVisibilityClauses;
            } else if (!isSuperAdmin) {
                unassignedWhere.id = null;
            }

            // 3. Perform optimized counts
            const [
                reviewCount,
                signatureCount,
                holdCount,
                atgNoteCount,
                pendingCount,
                vemCount,
                avemCount,
                emptyCount
            ] = await Promise.all([
                // Review
                LetterAssignment.count({
                    where: { ...where, step_id: 2, '$letter.tray_id$': { [Op.or]: [null, 0] }, '$letter.global_status$': [1, 8] },
                    include: [{ model: Letter, as: 'letter' }],
                    distinct: true,
                    col: 'letter_id'
                }),
                // Signature
                LetterAssignment.count({
                    where: { ...where, step_id: 1, '$letter.tray_id$': { [Op.or]: [null, 0] }, '$letter.global_status$': [1, 8] },
                    include: [{ model: Letter, as: 'letter' }],
                    distinct: true,
                    col: 'letter_id'
                }),
                // Hold
                LetterAssignment.count({
                    where: { ...where, '$letter.global_status$': 7 },
                    include: [{ model: Letter, as: 'letter' }],
                    distinct: true,
                    col: 'letter_id'
                }),
                // ATG Note (Assigned + Unassigned)
                (async () => {
                    if (!incomingStatusId) return 0;
                    const assigned = await LetterAssignment.count({
                        where: { ...where, '$letter.tray_id$': { [Op.gt]: 0 }, '$letter.global_status$': incomingStatusId },
                        include: [{ model: Letter, as: 'letter' }],
                        distinct: true,
                        col: 'letter_id'
                    });
                    const unassigned = await Letter.count({
                        where: { ...unassignedWhere, tray_id: { [Op.gt]: 0 }, global_status: incomingStatusId, id: { [Op.notIn]: sequelize.literal('(SELECT letter_id FROM letter_assignments WHERE letter_id IS NOT NULL)') } }
                    });
                    return assigned + unassigned;
                })(),
                // Pending (Assigned + Unassigned)
                (async () => {
                    const assigned = await LetterAssignment.count({
                        where: { ...where, step_id: null, '$letter.tray_id$': { [Op.or]: [null, 0] }, '$letter.global_status$': [1, 8] },
                        include: [{ model: Letter, as: 'letter' }],
                        distinct: true,
                        col: 'letter_id'
                    });
                    const unassigned = await Letter.count({
                        where: { ...unassignedWhere, tray_id: { [Op.or]: [null, 0] }, global_status: [1, 8], id: { [Op.notIn]: sequelize.literal('(SELECT letter_id FROM letter_assignments WHERE letter_id IS NOT NULL)') } }
                    });
                    return assigned + unassigned;
                })(),
                // VEM
                LetterAssignment.count({
                    where: { 
                        ...where, 
                        '$step.step_name$': { [Op.like]: '%VEM%' },
                        [Op.and]: [
                            { '$step.step_name$': { [Op.notLike]: '%AEVM%' } },
                            { '$step.step_name$': { [Op.notLike]: '%AEVEM%' } }
                        ],
                        step_id: { [Op.notIn]: [1, 2] },
                        '$letter.global_status$': [1, 8]
                    },
                    include: [{ model: Letter, as: 'letter' }, { model: ProcessStep, as: 'step' }],
                    distinct: true,
                    col: 'letter_id'
                }),
                // AVEM
                LetterAssignment.count({
                    where: { 
                        ...where, 
                        [Op.or]: [
                            { '$step.step_name$': { [Op.like]: '%AEVM%' } },
                            { '$step.step_name$': { [Op.like]: '%AEVEM%' } }
                        ],
                        step_id: { [Op.notIn]: [1, 2] },
                        '$letter.global_status$': [1, 8]
                    },
                    include: [{ model: Letter, as: 'letter' }, { model: ProcessStep, as: 'step' }],
                    distinct: true,
                    col: 'letter_id'
                }),
                // Empty (Empty sender/summary)
                (async () => {
                    const assigned = await LetterAssignment.count({
                        where: { 
                            ...where, 
                            '$letter.global_status$': { [Op.notIn]: [6, 9] },
                            [Op.or]: [
                                { '$letter.sender$': { [Op.or]: [null, '', ' '] } },
                                { '$letter.summary$': { [Op.or]: [null, '', ' '] } }
                            ]
                        },
                        include: [{ model: Letter, as: 'letter' }],
                        distinct: true,
                        col: 'letter_id'
                    });
                    const unassigned = await Letter.count({
                        where: { 
                            ...unassignedWhere, 
                            global_status: { [Op.notIn]: [6, 9] },
                            [Op.or]: [
                                { sender: { [Op.or]: [null, '', ' '] } },
                                { summary: { [Op.or]: [null, '', ' '] } }
                            ],
                            id: { [Op.notIn]: sequelize.literal('(SELECT letter_id FROM letter_assignments WHERE letter_id IS NOT NULL)') }
                        }
                    });
                    return assigned + unassigned;
                })()
            ]);

            res.json({
                review: reviewCount,
                signature: signatureCount,
                hold: holdCount,
                atg_note: atgNoteCount,
                pending: pendingCount,
                vem: vemCount,
                avem: avemCount,
                empty_entry: emptyCount
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = StatsController;
