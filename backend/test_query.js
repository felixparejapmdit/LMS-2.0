const { ProcessStep, LetterAssignment, Letter, Status } = require('./src/models/associations');
const { Op, Sequelize } = require('sequelize');
const sequelize = require('./src/config/db');
// Enable logging for this test
sequelize.options.logging = console.log;

async function test() {
    try {
        const includeCfg = [{
            model: LetterAssignment,
            as: 'assignments',
            required: false,
            attributes: ['id'],
            where: {
                status: 'Pending',
                [Op.and]: [
                    { '$assignments.letter.tray_id$': 0 },
                    {
                        [Op.or]: [
                            { '$assignments.letter.global_status$': 2 },
                            { '$assignments.letter.status.status_name$': 'ATG Note' }
                        ]
                    }
                ]
            },
            include: [{
                model: Letter,
                as: 'letter',
                required: true,
                include: [{
                    model: Status,
                    as: 'status',
                    attributes: ['status_name']
                }]
            }]
        }];

        const steps = await ProcessStep.findAll({
            include: includeCfg,
            subQuery: false
        });

        const stepsWithCount = steps.map(step => {
            const stepData = step.toJSON();
            // In the controller we did stepData.count = stepData.assignments?.filter(a => a.letter !== undefined).length || 0;
            // But since we use required: true for letter, assignments MUST have a letter.
            stepData.count = stepData.assignments?.length || 0;
            return { name: stepData.step_name, count: stepData.count };
        });
        console.log('Results:', JSON.stringify(stepsWithCount, null, 2));
    } catch (error) {
        console.error('Error details:', error);
    } finally {
        process.exit();
    }
}

test();
