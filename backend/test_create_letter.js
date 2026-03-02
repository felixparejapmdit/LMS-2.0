const { Letter } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function testCreate() {
    try {
        console.log('Testing Letter creation...');
        const letter = await Letter.create({
            lms_id: 'TEST-001',
            entry_id: 'TestEntry001',
            date_received: new Date(),
            sender: 'Test Sender',
            summary: 'Test Summary'
        });
        console.log('Success! Created letter with ID:', letter.id);

        // Cleanup
        await letter.destroy();
        console.log('Cleaned up test record.');
        process.exit(0);
    } catch (error) {
        console.error('Error in Letter.create():', error);
        process.exit(1);
    }
}

testCreate();
