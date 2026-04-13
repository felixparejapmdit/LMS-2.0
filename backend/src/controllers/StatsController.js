const { LetterAssignment, Letter, Status, User, Person, ProcessStep, Tray, LetterLog, Endorsement, Role, sequelize } = require('../models/associations');
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
            const SUPER_ROLES = ['ADMINISTRATOR', 'ADMIN'];
            const isSuperAdmin = SUPER_ROLES.includes(normalizedRole);
            const isAdmin = isSuperAdmin || SUPER_ROLES.includes(normalizedRole);
            const isSpecificDept = department_id && department_id !== 'all' && department_id !== 'null';

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
            const visibilityClauses = [];
            
            // 2. Department-based Visibility
            if (isSuperAdmin) {
                // Admins see everything globally
                visibilityClauses.push(sequelize.literal('1=1'));
            } else if (isAdmin) {
                if (myDeptId) {
                    if (!isSpecificDept || department_id == myDeptId) {
                        visibilityClauses.push({ dept_id: String(myDeptId) });
                        visibilityClauses.push(sequelize.literal(`EXISTS (
                            SELECT 1 FROM directus_users du
                            WHERE du.dept_id = ${sequelize.escape(String(myDeptId))}
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
                        visibilityClauses.push(sequelize.literal(`EXISTS (SELECT 1 FROM letter_assignments la WHERE la.letter_id = Letter.id AND la.department_id = ${sequelize.escape(String(myDeptId))})`));
                    }
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
            const { department_id, user_id, role, full_name: queryFullName } = req.query;
            const where = {};
            
            const userRecord = user_id ? await User.findByPk(user_id, {
                include: [{ model: Role, as: 'roleData' }]
            }) : null;

            const myDeptId = userRecord?.dept_id;
            const actualRoleName = userRecord?.roleData?.name || role;
            const full_name = userRecord ? `${userRecord.first_name || ''} ${userRecord.last_name || ''}`.trim() : queryFullName;

            const normalizedRole = actualRoleName ? actualRoleName.toString().toUpperCase().trim() : '';
            const SUPER_ROLES = ['ADMINISTRATOR', 'ADMIN'];
            const isSuperAdmin = SUPER_ROLES.includes(normalizedRole);
            const isAdmin = isSuperAdmin || SUPER_ROLES.includes(normalizedRole);
            const isValidId = (id) => id && id !== 'all' && id !== 'null' && id !== 'undefined' && id !== '';
            const isSpecificDept = isValidId(department_id);

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
            } else if (isAdmin) {
                if (myDeptId) {
                    // Specific department filter requested OR default to user's department
                    const targetDeptId = isSpecificDept ? department_id : myDeptId;
                    
                    visibilityClauses.push({ department_id: String(targetDeptId) });
                    visibilityClauses.push(sequelize.literal(`EXISTS (
                        SELECT 1 FROM directus_users du
                        JOIN letters l ON l.id = LetterAssignment.letter_id
                        WHERE du.dept_id = ${sequelize.escape(String(targetDeptId))}
                        AND (
                            du.id IN (l.encoder_id, l.sender, l.endorsed)
                            OR (du.first_name || ' ' || du.last_name) = l.sender
                            OR (du.first_name || ' ' || du.last_name) = l.endorsed
                        )
                    )`));
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
                if ([1, 8].includes(globalStatus) && stepName.includes('VEM') && !stepName.includes('AEVM') && !stepName.includes('AEVEM') && stepId !== 1 && stepId !== 2 && !isVip && globalStatus !== 7) counts.vem++;

                // AVEM
                if ([1, 8].includes(globalStatus) && (stepName.includes('AEVM') || stepName.includes('AEVEM')) && stepId !== 1 && stepId !== 2 && !isVip && globalStatus !== 7) counts.avem++;

                // ATG Note (Incoming (1) or ATG Note (2) and has tray)
                if ([1, 2].includes(globalStatus) && hasTray) counts.atg_note++;

                // Pending (Incoming (1) or Pending (8) AND No Process Step AND No Tray)
                if ([1, 8].includes(globalStatus) && !stepId && !hasTray && !isVip) counts.pending++;

                // Hold
                if (globalStatus === 7 && !isVip) counts.hold++;

                // Empty Entry (from assignments)
                if (globalStatus !== 6 && globalStatus !== 9 && !isVip) {
                    const hasNoSenderOrSummary = !a.letter?.sender || a.letter?.sender?.trim() === '' || !a.letter?.summary || a.letter?.summary?.trim() === '';
                    if (hasNoSenderOrSummary) counts.empty_entry++;
                }
            });

            // MUST respect department filter for unassigned counts
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
                // Super Admins see everything globally for unassigned letters
                unassignedVisibilityClauses.push(sequelize.literal('1=1'));
            } else if (isAdmin) {
                if (myDeptId) {
                    const targetDeptId = isSpecificDept ? department_id : myDeptId;
                    unassignedVisibilityClauses.push({
                        [Op.or]: [
                            { dept_id: String(targetDeptId) },
                            { dept_id: { [Op.or]: [null, 0] } } // Include items with no department yet
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
            } else if (!isAdmin) {
                unassignedWhere.id = null;
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
                const globalStatus = l.global_status;

                if (hasTray) {
                    // ATG notes can be status 1 or 2
                    if ([1, 2].includes(globalStatus)) counts.atg_note++;
                } else {
                    // Pending/Mock assignments count for status 1 and 8
                    if ([1, 8].includes(globalStatus)) {
                        const hasNoSenderOrSummary = !l.sender || l.sender.trim() === '' || !l.summary || l.summary.trim() === '';
                        if (hasNoSenderOrSummary) {
                            counts.empty_entry++;
                        }
                        counts.pending++;
                    }
                }
            });

            res.json(counts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = StatsController;