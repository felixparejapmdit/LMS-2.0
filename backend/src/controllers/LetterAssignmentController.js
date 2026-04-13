const { LetterAssignment, Letter, ProcessStep, Department, Status, Tray, LetterKind, Comment, Endorsement, User, Role, sequelize } = require('../models/associations');
const { Op } = require('sequelize');
const ALL_LETTER_ROLES = new Set(['ADMINISTRATOR']);

class LetterAssignmentController {
    static async getAll(req, res) {
        const startTime = Date.now();
        try {
            const { department_id, step_id, status, vip, global_status, named_filter, user_id, role, page = 1, limit = 50, full_name: queryFullName } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const queryLimit = parseInt(limit);
            const where = {};

            const userRecord = user_id ? await User.findByPk(user_id, {
                include: [{ model: Role, as: 'roleData' }]
            }) : null;

            const myDeptId = userRecord?.dept_id;
            const actualRoleName = userRecord?.roleData?.name || role;
            const full_name = userRecord ? `${userRecord.first_name || ''} ${userRecord.last_name || ''}`.trim() : queryFullName;

            const normalizedRole = actualRoleName ? actualRoleName.toString().toUpperCase().trim() : '';

            console.log(`[ASSIGNMENTS] Lookup started: role="${normalizedRole}", dept="${department_id}", name="${full_name}"`);

            const SUPER_ROLES = ['ADMINISTRATOR', 'ADMIN'];
            const isSuperAdmin = SUPER_ROLES.includes(normalizedRole);
            const isAdminActual = isSuperAdmin || SUPER_ROLES.includes(normalizedRole);
            
            const isValidId = (id) => id && id !== 'all' && id !== 'null' && id !== 'undefined' && id !== '';
            const isSpecificDept = isValidId(department_id);

            let atgStatusId = null;
            if (vip === 'true' || req.query.exclude_vip === 'true' || named_filter === 'atg_note') {
                const atgStatus = await Status.findOne({ where: { status_name: 'ATG Note' } });
                atgStatusId = atgStatus?.id || null;
            }

            const visibilityClauses = [];

            if (user_id) {
                // Involvement by user ID (Always Visible)
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
                visibilityClauses.push(sequelize.literal('1=1'));
            } else if (isAdminActual) {
                if (myDeptId) {
                    if (!isSpecificDept || department_id == myDeptId) {
                        visibilityClauses.push({ department_id: String(myDeptId) });
                        visibilityClauses.push(sequelize.literal(`EXISTS (
                            SELECT 1 FROM directus_users du
                            JOIN letters l ON l.id = LetterAssignment.letter_id
                            WHERE du.dept_id = ${sequelize.escape(String(myDeptId))}
                            AND (
                                du.id IN (l.encoder_id, l.sender, l.endorsed)
                                OR (du.first_name || ' ' || du.last_name) = l.sender
                                OR (du.first_name || ' ' || du.last_name) = l.endorsed
                            )
                        )`));
                    }
                }
            }

            if (visibilityClauses.length > 0) {
                where[Op.or] = visibilityClauses;
            } else if (!isSuperAdmin) {
                // Non-admins with no involvement and no department access see nothing
                where.id = null;
            }
            // Super Admins with no filters see everything

            if (step_id && step_id !== 'null') where.step_id = step_id;

            // status filter from query now maps to status_id if numeric, otherwise we filter by joined status name
            if (status && status !== 'null') {
                if (!isNaN(status)) {
                    where.status_id = parseInt(status);
                } else if (named_filter !== 'hold' && named_filter !== 'atg_note') {
                    // Fallback to searching by status name in the joined table if it's not a numeric ID
                    where['$letter.status.status_name$'] = status;
                }
            }

            if (global_status) where['$letter.global_status$'] = global_status;

            if (named_filter) {
                if (named_filter === 'review') {
                    // For Review: Not Done/Filed (IDs 9, 6), For Review step (ID 2), No tray
                    where[Op.and] = [
                        { '$letter.global_status$': { [Op.in]: [1, 8] } }, // Allow Incoming(1) and Pending(8)
                        { step_id: 2 },
                        { '$letter.tray_id$': { [Op.or]: [null, 0] } }
                    ];
                } else if (named_filter === 'signature') {
                    // For Signature: Not Done/Filed, For Signature step (ID 1), No tray
                    where[Op.and] = [
                        { '$letter.global_status$': { [Op.in]: [1, 8] } }, // Allow Incoming(1) and Pending(8)
                        { step_id: 1 },
                        { '$letter.tray_id$': { [Op.or]: [null, 0] } }
                    ];
                } else if (named_filter === 'atg_note') {
                    // FOR ATG NOTE: Only Incoming (1) with tray
                    where[Op.and] = [
                        { '$letter.global_status$': 1 },
                        { '$letter.tray_id$': { [Op.gt]: 0 } }
                    ];
                } else if (named_filter === 'vem') {
                    // VEM: Incoming(1) or Pending(8), VEM step
                    where[Op.and] = [
                        { '$letter.global_status$': { [Op.in]: [1, 8] } },
                        { 
                            [Op.and]: [
                                { '$step.step_name$': { [Op.like]: '%VEM%' } },
                                { '$step.step_name$': { [Op.notLike]: '%AEVM%' } },
                                { '$step.step_name$': { [Op.notLike]: '%AEVEM%' } }
                            ]
                        },
                        { '$step.step_name$': { [Op.notIn]: ['For Review', 'For Signature'] } }
                    ];
                } else if (named_filter === 'avem') {
                    // AEVM/AEVEM: Incoming(1) or Pending(8), AEVM step
                    where[Op.and] = [
                        { '$letter.global_status$': { [Op.in]: [1, 8] } },
                        { 
                            [Op.or]: [
                                { '$step.step_name$': { [Op.like]: '%AEVM%' } },
                                { '$step.step_name$': { [Op.like]: '%AEVEM%' } }
                            ]
                        },
                        { '$step.step_name$': { [Op.notIn]: ['For Review', 'For Signature'] } }
                    ];
                } else if (named_filter === 'pending') {
                    // Pending/Incoming: Status = 1 (Incoming) or 8 (Pending) AND No Process Step
                    where['$letter.global_status$'] = { [Op.in]: [1, 8] };
                    where.step_id = null;
                    where['$letter.tray_id$'] = { [Op.or]: [null, 0] };
                } else if (named_filter === 'empty_entry') {
                    where[Op.and] = [
                        { '$letter.global_status$': { [Op.notIn]: [6, 9] } },
                        {
                            [Op.or]: [
                                { '$letter.sender$': { [Op.or]: ['', null] } },
                                { '$letter.summary$': { [Op.or]: ['', null] } }
                            ]
                        }
                    ];
                } else if (named_filter === 'hold') {
                    where['$letter.global_status$'] = 7; // Status ID for Hold
                }
            }

            const letterInclude = {
                model: Letter,
                as: 'letter',
                required: (named_filter === 'review' || named_filter === 'signature' || named_filter === 'pending' || named_filter === 'empty_entry' || named_filter === 'hold' || named_filter === 'vem' || named_filter === 'avem' || named_filter === 'atg_note' || !!global_status || vip === 'true' || req.query.exclude_vip === 'true' || req.query.outbox === 'true'),
                include: [
                    {
                        model: Status,
                        as: 'status',
                        attributes: ['status_name'],
                        required: (named_filter === 'review' || named_filter === 'signature' || named_filter === 'pending' || named_filter === 'empty_entry' || named_filter === 'hold' || named_filter === 'vem' || named_filter === 'avem' || named_filter === 'atg_note' || req.query.outbox === 'true' || vip === 'true' || req.query.exclude_vip === 'true')
                    },
                    { model: Tray, as: 'tray' },
                    { model: LetterKind, as: 'letterKind' },
                    { model: Comment, as: 'comments', attributes: ['id'] },
                    { model: Endorsement, as: 'endorsements' }
                ]
            };

            if (req.query.outbox === 'true') {
                if (!where[Op.and]) where[Op.and] = [];
                where[Op.and].push({
                    [Op.or]: [
                        { '$letter.global_status$': 3 },
                        { '$letter.status.status_name$': 'Review' }
                    ]
                });
            }

            if (vip === 'true') {
                const atgStatusFilter = atgStatusId
                    ? {
                        [Op.or]: [
                            { '$letter.global_status$': atgStatusId },
                            { '$letter.status.status_name$': 'ATG Note' }
                        ]
                    }
                    : { '$letter.status.status_name$': 'ATG Note' };
                if (!where[Op.and]) where[Op.and] = [];
                where[Op.and].push({ '$letter.tray_id$': { [Op.or]: [0, null] } }, atgStatusFilter);
            } else if (req.query.exclude_vip === 'true' && named_filter !== 'atg_note') {
                // Only exclude VIPs from general tabs, allow in ATG Note if specifically requested there
                if (!where[Op.not]) where[Op.not] = {};
                const atgStatusFilter = atgStatusId
                    ? {
                        [Op.or]: [
                            { '$letter.global_status$': atgStatusId },
                            { '$letter.status.status_name$': 'ATG Note' }
                        ]
                    }
                    : { '$letter.status.status_name$': 'ATG Note' };
                where[Op.not] = {
                    [Op.and]: [
                        { '$letter.tray_id$': { [Op.or]: [0, null] } },
                        atgStatusFilter
                    ]
                };
            }

            // Perform the primary assignment search
            const { count: realCount, rows: realRows } = await LetterAssignment.findAndCountAll({
                where,
                include: [
                    letterInclude,
                    {
                        model: ProcessStep,
                        as: 'step',
                        required: (named_filter === 'review' || named_filter === 'signature' || named_filter === 'vem' || named_filter === 'avem' || (named_filter === 'pending' && isAdminActual))
                    },
                    { model: Department, as: 'department' }
                ],
                order: [['created_at', 'DESC']],
                limit: queryLimit,
                offset: offset,
                distinct: true,
                subQuery: false
            });

            let finalAssignments = realRows;
            let totalCount = realCount;

            // Optional: If 'pending' requires showing letters that have NO assignment record at all
            // Optimized to only fetch what's needed locally or to add to the count
            if (named_filter === 'pending' || named_filter === 'empty_entry' || named_filter === 'atg_note') {
                const validStatuses = [1, 8];
                if (named_filter === 'atg_note') validStatuses.push(2);

                const unassignedWhere = {
                    global_status: { [Op.in]: validStatuses }
                };
                if (isSpecificDept && !isSuperAdmin) {
                    unassignedWhere[Op.or] = [
                        { dept_id: department_id },
                        sequelize.literal(`EXISTS (SELECT 1 FROM directus_users u WHERE u.id = Letter.encoder_id AND u.dept_id = ${sequelize.escape(department_id)})`)
                    ];
                    if (isAdminActual) {
                        unassignedWhere[Op.or].push({ dept_id: { [Op.or]: [null, 0] } });
                    }
                }

                // Add the specific filter for "Empty" or "ATG Note" or "Pending"
                if (named_filter === 'atg_note') {
                    unassignedWhere.tray_id = { [Op.gt]: 0 };
                } else {
                    unassignedWhere.tray_id = { [Op.or]: [null, 0] };
                    if (named_filter === 'empty_entry') {
                        unassignedWhere[Op.and] = [
                            { [Op.or]: [{ sender: null }, { sender: '' }, { summary: null }, { summary: '' }] }
                        ];
                    }
                }

                // Optimization: Use subQuery false to find purely unassigned via SQL directly
                const unassignedCheck = await Letter.findAll({
                    where: {
                        ...unassignedWhere,
                        id: { [Op.notIn]: sequelize.literal('(SELECT letter_id FROM letter_assignments WHERE letter_id IS NOT NULL)') }
                    },
                    attributes: ['id'], // We only need count for paging
                    transaction: null
                });

                const purelyUnassignedCount = unassignedCheck.length;
                totalCount += purelyUnassignedCount;

                // Only fetch mock records if the current page actually covers them (this is complex, simplified for now)
                if (finalAssignments.length < queryLimit && purelyUnassignedCount > 0) {
                    const moreNeeded = queryLimit - finalAssignments.length;
                    const purelyUnassigned = await Letter.findAll({
                        where: {
                            ...unassignedWhere,
                            id: { [Op.notIn]: sequelize.literal('(SELECT letter_id FROM letter_assignments WHERE letter_id IS NOT NULL)') }
                        },
                        include: [{ model: Status, as: 'status' }, { model: Tray, as: 'tray' }, { model: LetterKind, as: 'letterKind' }],
                        limit: moreNeeded,
                        order: [['created_at', 'DESC']]
                    });

                    const mappedMocks = purelyUnassigned.map(l => ({
                        id: `mock-${l.id}`,
                        letter_id: l.id,
                        letter: l,
                        status: 'Pending',
                        step: null,
                        department: null,
                        created_at: l.created_at
                    }));
                    finalAssignments = [...finalAssignments, ...mappedMocks];
                }
            }

            console.log(`[ASSIGNMENTS] Fetch complete in ${Date.now() - startTime}ms. Found ${totalCount} records.`);
            res.json({
                data: finalAssignments,
                total: totalCount,
                page: parseInt(page),
                limit: queryLimit,
                totalPages: Math.ceil(totalCount / queryLimit)
            });
        } catch (error) {
            console.error('Error in LetterAssignment.getAll:', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const assignment = await LetterAssignment.create(req.body);
            res.status(201).json(assignment);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            let id = req.params.id;

            // Handle virtual 'mock-' IDs from Pending/Unassigned view
            if (id.toString().startsWith('mock-')) {
                const letterId = id.replace('mock-', '');
                let { step_id, status_id, department_id } = req.body;

                // Infer department from step if missing
                if (!department_id && step_id) {
                    const step = await ProcessStep.findByPk(step_id);
                    if (step) department_id = step.dept_id;
                }

                // Create a real assignment instead of updating
                const newAssignment = await LetterAssignment.create({
                    letter_id: letterId,
                    step_id: step_id || null,
                    status_id: status_id || 8, // Default to Pending
                    department_id: department_id || null,
                    assigned_by: req.query.user_id || null
                });
                return res.json(newAssignment);
            }

            const assignment = await LetterAssignment.findByPk(id);
            if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
            await assignment.update(req.body);
            res.json(assignment);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = LetterAssignmentController;