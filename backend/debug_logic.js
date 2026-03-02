const { Letter, LetterAssignment, Status } = require('./src/models/associations');

async function debugQueries() {
    try {
        console.log('--- Testing Letter.findAll ---');
        await Letter.findAll({
            include: ['letterKind', 'status', 'attachment', 'tray'],
            limit: 1
        });
        console.log('Letter query success');

        console.log('--- Testing LetterAssignment.findAll ---');
        await LetterAssignment.findAll({
            include: [
                { model: Letter, as: 'letter', include: ['letterKind', 'status', 'attachment', 'tray'] }
            ],
            limit: 1
        });
        console.log('Assignment query success');

        process.exit(0);
    } catch (error) {
        console.error('DEBUG ERROR:', error);
        process.exit(1);
    }
}

debugQueries();
