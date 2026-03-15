const { Letter, LetterAssignment, Status } = require('./src/models/associations');

async function createTestData() {
    try {
        let atgStatus = await Status.findOne({ where: { status_name: 'ATG Note' } });
        if (!atgStatus) {
            atgStatus = await Status.create({ status_name: 'ATG Note' });
        }

        const letter = await Letter.create({
            lms_id: 'VIP-TEST-001',
            entry_id: 'ENTRY-001',
            date_received: new Date(),
            sender: 'VIP SENDER',
            summary: 'VIP SUMMARY',
            tray_id: null,
            global_status: 2
        });

        await LetterAssignment.create({
            letter_id: letter.id,
            step_id: 1,
            department_id: 1,
            status: 'Pending'
        });

        console.log('Test data created successfully');
    } catch (error) {
        console.error('Error creating test data:', error);
    } finally {
        process.exit();
    }
}

createTestData();
