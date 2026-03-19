const { Letter, LetterAssignment, ProcessStep, Status } = require('./src/models/associations');
const { Op } = require('sequelize');

async function debugLetter() {
    try {
        const lmsId = 'LMS26-00007';
        console.log(`Searching for letter: ${lmsId}`);
        
        const letter = await Letter.findOne({
            where: { lms_id: lmsId },
            include: [
                { model: Status, as: 'status' }
            ]
        });

        if (!letter) {
            console.log('Letter not found');
            return;
        }

        console.log('Letter Record Fields:');
        console.log(JSON.stringify(letter.toJSON(), null, 2));

        const assignments = await LetterAssignment.findAll({
            where: { letter_id: letter.id },
            include: [{ model: ProcessStep, as: 'step' }]
        });

        console.log('\nAssignments Records:');
        assignments.forEach(a => {
            console.log(JSON.stringify(a.toJSON(), null, 2));
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

debugLetter();
