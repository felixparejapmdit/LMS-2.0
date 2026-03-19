const { LetterAssignment, Letter, ProcessStep, Status } = require('./src/models/associations');
const { Op } = require('sequelize');

async function testVemFilter() {
    try {
        const named_filter = 'vem';
        
        // Exact logic from LetterAssignmentController.js + Dashboard.jsx query params
        const where = {
            status: 'Pending'
        };
        
        where[Op.and] = [
            { '$step.step_name$': { [Op.like]: '%VEM%' } },
            { '$step.step_name$': { [Op.notLike]: '%AEVM%' } },
            { '$letter.status.status_name$': { [Op.notIn]: ['Filed', 'Done'] } }
        ];

        console.log('Querying assignments for "vem" filter with logging...');
        const results = await LetterAssignment.findAll({
            where,
            include: [
                { 
                    model: Letter, 
                    as: 'letter', 
                    required: true, 
                    include: [{ model: Status, as: 'status', required: true }] 
                },
                { model: ProcessStep, as: 'step', required: true }
            ],
            logging: (sql) => console.log('SQL:', sql)
        });

        console.log(`\nFound ${results.length} assignments.`);
        results.forEach(a => {
            console.log(`- Assignment ID: ${a.id}, Letter: ${a.letter?.lms_id}, Step: ${a.step?.step_name}`);
        });

        // Also check if LMS26-00007 matches ANY part of the logic
        console.log('\nChecking LMS26-00007 specific assignment...');
        const l7 = await LetterAssignment.findOne({
            where: { id: 8 }, // from debug script
            include: [
                { model: Letter, as: 'letter', include: [{ model: Status, as: 'status' }] },
                { model: ProcessStep, as: 'step' }
            ]
        });

        if (l7) {
            const matchesStepVem = (l7.step?.step_name || '').includes('VEM');
            const matchesLetterStatus = !['Filed', 'Done'].includes(l7.letter?.status?.status_name);
            console.log(`LMS26-00007 Assignment (ID 8):`);
            console.log(`- Step: "${l7.step?.step_name}" Matches %VEM%?: ${matchesStepVem}`);
            console.log(`- Letter Status: "${l7.letter?.status?.status_name}" Matches not in [Filed, Done]?: ${matchesLetterStatus}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

testVemFilter();
