const { LetterAssignment, Letter, ProcessStep, Status } = require('./src/models/associations');
const { Op } = require('sequelize');

async function testQuery() {
    try {
        const where = {
            '$step.step_name$': { [Op.like]: '%Review%' }
        };

        const assignments = await LetterAssignment.findAll({
            where,
            include: [
                {
                    model: Letter,
                    as: 'letter',
                    include: [{ model: Status, as: 'status' }]
                },
                { model: ProcessStep, as: 'step' }
            ],
            subQuery: false
        });

        console.log(`Found ${assignments.length} review assignments`);
        if (assignments.length > 0) {
            console.log("Sample:", assignments[0].id, assignments[0].step?.step_name);
        }
    } catch (e) {
        console.error(e);
    }
}

testQuery();
