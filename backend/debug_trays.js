const { Tray, Letter } = require('./src/models/associations');

async function testQuery() {
    try {
        console.log('Testing Tray.findAll()...');
        const trays = await Tray.findAll({
            include: [{ model: Letter, as: 'letters' }]
        });
        console.log('Success! Found', trays.length, 'trays.');
        process.exit(0);
    } catch (error) {
        console.error('Error in Tray.findAll():', error);
        process.exit(1);
    }
}

testQuery();
