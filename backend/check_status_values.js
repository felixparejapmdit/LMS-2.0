const sequelize = require('./src/config/db.js');
async function check() {
    try {
        const [statuses] = await sequelize.query('SELECT * FROM ref_statuses');
        console.log('REF STATUSES:');
        console.log(statuses);

        const [assignments] = await sequelize.query('SELECT id, letter_id, department_id, status_id, status FROM letter_assignments LIMIT 10');
        console.log('\nLETTER ASSIGNMENTS:');
        console.log(assignments);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
check();
