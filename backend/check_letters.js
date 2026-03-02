const sequelize = require('./src/config/db');

async function checkLetters() {
    try {
        const [results] = await sequelize.query("SELECT id, lms_id, tray_id, global_status FROM letters");
        console.log('--- LETTERS ---');
        results.forEach(row => console.log(JSON.stringify(row)));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkLetters();
