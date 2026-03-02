const sequelize = require('./src/config/db');

async function checkStatuses() {
    try {
        const [results] = await sequelize.query("SELECT id, status_name FROM ref_statuses");
        console.log('--- STATUSES ---');
        results.forEach(row => console.log(JSON.stringify(row)));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkStatuses();
