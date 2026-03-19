const { LetterAssignment, Letter, ProcessStep, Status } = require('./src/models/associations');
const { Op } = require('sequelize');

async function testAvemFilter() {
    try {
        const named_filter = 'avem';
        const where = { status: 'Pending' }; // as from Dashboard.jsx
        
        // Exact logic from LetterAssignmentController.js
        where[Op.and] = [
            { '$step.step_name$': { [Op.like]: '%AEVM%' } },
            { '$letter.status.status_name$': { [Op.notIn]: ['Filed', 'Done'] } }
        ];

        console.log('Querying assignments for "avem" filter...');
        const results = await LetterAssignment.findAll({
            where,
            include: [
                { model: Letter, as: 'letter', include: [{ model: Status, as: 'status' }] },
                { model: ProcessStep, as: 'step' }
            ]
        });

        console.log(`Found ${results.length} assignments.`);
        results.forEach(a => {
            console.log(`- Assignment ID: ${a.id}, Letter: ${a.letter?.lms_id}, Step: ${a.step?.step_name}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

testAvemFilter();
