const { Letter, LetterAssignment, ProcessStep, Status } = require('./backend/src/models/associations');
const { Op } = require('sequelize');

async function debugLetter() {
    try {
        const lmsId = 'LMS26-00007';
        console.log(`Searching for letter: ${lmsId}`);
        
        const letter = await Letter.findOne({
            where: { lms_id: lmsId },
            include: [
                { model: Status, as: 'status' },
                { 
                    model: LetterAssignment, 
                    as: 'assignments',
                    include: [{ model: ProcessStep, as: 'step' }]
                }
            ]
        });

        if (!letter) {
            console.log('Letter not found');
            return;
        }

        console.log('Letter Info:');
        console.log(`- ID: ${letter.id}`);
        console.log(`- Status: ${letter.status?.status_name} (ID: ${letter.global_status})`);
        console.log(`- VemCode: "${letter.vemcode}"`);
        console.log(`- AvemNumber: "${letter.aevm_number}"`);
        
        console.log('\nAssignments:');
        letter.assignments.forEach(a => {
            console.log(`- Assignment ID: ${a.id}`);
            console.log(`  - Status: ${a.status} (status_id: ${a.status_id})`);
            console.log(`  - Step: ${a.step?.step_name} (ID: ${a.step_id})`);
            console.log(`  - Tray: ${a.tray_id}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

debugLetter();
