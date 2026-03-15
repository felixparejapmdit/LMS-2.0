const { LetterAssignment, Letter, ProcessStep, Department, Status, Tray, LetterKind, Comment, Endorsement } = require('../models/associations');
const { Op } = require('sequelize');
const ALL_LETTER_ROLES = new Set([
    'ADMIN',
    'ADMINISTRATOR',
    'SUPERUSER',
    'SUPER USER',
    'SYSTEM ADMIN',
    'SYSTEMADMIN',
    'SUPER ADMIN',
    'SUPERADMIN'
]);

class LetterAssignmentController {
    static async getAll(req, res) {
        try {
            const { department_id, step_id, status, vip, global_status, named_filter, user_id, role } = req.query;
            const where = {};

            const normalizedRole = role ? role.toString().toUpperCase() : '';
            let atgStatusId = null;
            if (vip === 'true' || req.query.exclude_vip === 'true' || named_filter === 'atg_note') {
                const atgStatus = await Status.findOne({ where: { status_name: 'ATG Note' } });
                atgStatusId = atgStatus?.id || null;
            }

            // Role-based filtering for USER role
            if (normalizedRole === 'USER' && user_id) {
                const hasValidDepartment = department_id && department_id !== 'null' && department_id !== 'undefined' && department_id !== '';
                const visibilityClauses = [{ '$letter.encoder_id$': user_id }];
                if (hasValidDepartment) {
                    visibilityClauses.push({ department_id: department_id });
                }
                where[Op.or] = visibilityClauses;
            } else if (!ALL_LETTER_ROLES.has(normalizedRole) && department_id && department_id !== 'null' && department_id !== 'undefined' && req.query.outbox !== 'true') {
                // Default department filtering for non-USER or when explicitly requested
                where[Op.or] = [
                    { department_id: department_id },
                    { department_id: null }
                ];
            }

            if (step_id && step_id !== 'null') where.step_id = step_id;

            if (status && status !== 'null') {
                // For 'hold' and 'atg_note' filters, we don't want to restrict to 'Pending' assignments
                if (named_filter !== 'hold' && named_filter !== 'atg_note') {
                    where.status = status;
                }
            }

            if (global_status) where['$letter.global_status$'] = global_status;

            if (named_filter) {
                const incomingStatus = await Status.findOne({ where: { status_name: 'Incoming' } });
                const incId = incomingStatus?.id || 1;

                if (named_filter === 'review') {
                    // For Review: Not Done/Filed, For Review(No tray assigned)
                    const step = await ProcessStep.findByPk(2);
                    where[Op.and] = [
                        { '$letter.status.status_name$': { [Op.notIn]: ['Filed', 'Done'] } },
                        { '$step.step_name$': step?.step_name || 'For Review' },
                        { '$letter.tray_id$': { [Op.or]: [null, 0] } }
                    ];
                } else if (named_filter === 'signature') {
                    // For Signature: Not Done/Filed, For Signature(No tray assigned)
                    const step = await ProcessStep.findByPk(1);
                    where[Op.and] = [
                        { '$letter.status.status_name$': { [Op.notIn]: ['Filed', 'Done'] } },
                        { '$step.step_name$': step?.step_name || 'For Signature' },
                        { '$letter.tray_id$': { [Op.or]: [null, 0] } }
                    ];
                } else if (named_filter === 'atg_note') {
                    // FOR ATG NOTE: Any Status(except Filed/Done), Tray strictly > 0
                    where['$letter.tray_id$'] = { [Op.gt]: 0 };
                    if (!where[Op.and]) where[Op.and] = [];
                    where[Op.and].push({
                        [Op.or]: [
                            { '$letter.status.status_name$': { [Op.notIn]: ['Filed', 'Done'] } },
                            { '$letter.status.status_name$': null }
                        ]
                    });
                } else if (named_filter === 'vem') {
                    where[Op.or] = [
                        { '$step.step_name$': { [Op.like]: '%VEM%' } },
                        { '$letter.vemcode$': { [Op.and]: [{ [Op.ne]: '' }, { [Op.not]: null }] } }
                    ];
                } else if (named_filter === 'pending') {
                    // Pending: Status = Incoming AND No Process Step AND Not specifically Review/Signature
                    where['$letter.status.status_name$'] = 'Incoming';
                    where['$step.id$'] = null;

                    const reviewStep = await ProcessStep.findByPk(2);
                    const signatureStep = await ProcessStep.findByPk(1);
                    const rName = reviewStep?.step_name || 'For Review';
                    const sName = signatureStep?.step_name || 'For Signature';

                    // Exclude any that might somehow still be labeled as Review/Signature in other ways if any
                    if (!where[Op.and]) where[Op.and] = [];
                    where[Op.and].push({
                        [Op.not]: {
                            [Op.or]: [
                                { '$step.step_name$': rName },
                                { '$step.step_name$': sName }
                            ]
                        }
                    });
                } else if (named_filter === 'hold') {
                    where['$letter.status.status_name$'] = { [Op.or]: ['Hold', 'On Hold'] };
                }
            }

            const letterInclude = {
                model: Letter,
                as: 'letter',
                required: (named_filter === 'review' || named_filter === 'signature' || named_filter === 'pending' || named_filter === 'hold' || named_filter === 'vem' || named_filter === 'atg_note' || !!global_status || vip === 'true' || req.query.exclude_vip === 'true' || req.query.outbox === 'true'),
                include: [
                    {
                        model: Status,
                        as: 'status',
                        attributes: ['status_name'],
                        required: (named_filter === 'review' || named_filter === 'signature' || named_filter === 'pending' || named_filter === 'hold' || named_filter === 'atg_note' || req.query.outbox === 'true' || vip === 'true' || req.query.exclude_vip === 'true')
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

            let assignments = await LetterAssignment.findAll({
                where,
                include: [
                    letterInclude,
                    {
                        model: ProcessStep,
                        as: 'step',
                        required: (named_filter === 'review' || named_filter === 'signature' || named_filter === 'vem')
                    },
                    { model: Department, as: 'department' }
                ],
                order: [['created_at', 'DESC']],
                subQuery: false
            });

            // If named_filter is 'pending', also fetch letters with status 'Incoming' that have NO assignment record at all
            if (named_filter === 'pending') {
                const incomingStatus = await Status.findOne({ where: { status_name: 'Incoming' } });
                const unassignedLetters = await Letter.findAll({
                    where: {
                        global_status: incomingStatus?.id || 1,
                        tray_id: { [Op.or]: [0, null] }
                    },
                    include: [
                        { model: Status, as: 'status' },
                        { model: Tray, as: 'tray' },
                        { model: LetterKind, as: 'letterKind' },
                        { model: Comment, as: 'comments', attributes: ['id'] },
                        { model: LetterAssignment, as: 'assignments', required: false }
                    ]
                });
                const purelyUnassigned = unassignedLetters.filter(l => (l.assignments || []).length === 0);
                const mappedMocks = purelyUnassigned.map(l => ({
                    id: `mock-${l.id}`,
                    letter_id: l.id,
                    letter: l,
                    status: 'Pending',
                    step: null,
                    department: null,
                    created_at: l.created_at
                }));
                assignments = [...assignments, ...mappedMocks];
            }

            res.json(assignments);
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
            const assignment = await LetterAssignment.findByPk(req.params.id);
            if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
            await assignment.update(req.body);
            res.json(assignment);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = LetterAssignmentController;
