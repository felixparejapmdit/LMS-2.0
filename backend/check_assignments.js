const sequelize = require('./src/config/db');

async function checkAssignments() {
    try {
        const [results] = await sequelize.query("SELECT id, letter_id, step_id, status FROM letter_assignments");
        console.log('--- ASSIGNMENTS ---');
        results.forEach(row => console.log(JSON.stringify(row)));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkAssignments();
