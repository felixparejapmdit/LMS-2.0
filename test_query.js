const { ProcessStep, LetterAssignment, Letter, Status } = require('./backend/src/models/associations');
const { Op } = require('sequelize');

async function test() {
    try {
        const includeCfg = [{
            model: LetterAssignment,
            as: 'assignments',
            where: { status: 'Pending' },
            required: false,
            attributes: ['id'],
            include: [{
                model: Letter,
                as: 'letter',
                required: true,
                where: {
                    tray_id: 0,
                    [Op.or]: [
                        { global_status: 2 },
                        { '$status.status_name$': 'ATG Note' }
                    ]
                },
                include: [{
                    model: Status,
                    as: 'status',
                    attributes: ['status_name'],
                    required: false
                }]
            }]
        }];

        const steps = await ProcessStep.findAll({
            include: includeCfg,
            subQuery: false
        });
        console.log('Success:', steps.length);
    } catch (error) {
        console.error('Error details:', error);
    } finally {
        process.exit();
    }
}

test();
