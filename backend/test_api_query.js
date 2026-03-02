const { LetterAssignment, Letter, ProcessStep, Department, Status, Tray, LetterKind, Comment } = require('./src/models/associations');
const { Op } = require('sequelize');

async function testApiLike() {
    try {
        const where = {};
        const named_filter = 'review';
        const vip = undefined;
        const outbox = undefined;
        const global_status = undefined;
        where.status = 'Pending';
        where['$step.step_name$'] = { [Op.like]: '%Review%' };

        const letterInclude = {
            model: Letter,
            as: 'letter',
            required: (named_filter === 'pending' || named_filter === 'hold' || named_filter === 'vem' || !!global_status || vip === 'true' || true || outbox === 'true'), // proxying what it evaluated to
            include: [
                {
                    model: Status,
                    as: 'status',
                    attributes: ['status_name'],
                    required: false
                },
                { model: Tray, as: 'tray' },
                { model: LetterKind, as: 'letterKind' },
                { model: Comment, as: 'comments', attributes: ['id'] }
            ]
        };

        if (true) { // exclude_vip === true
            if (!where[Op.not]) where[Op.not] = {};
            where[Op.not] = {
                [Op.and]: [
                    { '$letter.tray_id$': 0 },
                    {
                        [Op.or]: [
                            { '$letter.global_status$': 2 },
                            { '$letter.status.status_name$': 'ATG Note' }
                        ]
                    }
                ]
            };
        }

        console.log("Starting query...");

        const assignments = await LetterAssignment.findAll({
            where,
            include: [
                letterInclude,
                {
                    model: ProcessStep,
                    as: 'step',
                    required: true
                },
                { model: Department, as: 'department' }
            ],
            order: [['created_at', 'DESC']],
            subQuery: false
        });

        console.log(`Found ${assignments.length} assignments`);
    } catch (e) {
        console.error(e);
    }
}
testApiLike();
