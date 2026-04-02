const { Status } = require('../backend/src/models/associations');
const sequelize = require('../backend/src/config/db');

async function check() {
    try {
        const statuses = await Status.findAll();
        console.log('Statuses:', statuses.map(s => `ID: ${s.id}, Name: ${s.status_name}`));
        process.exit(0);
    } catch (err) {
        console.log(err.message);
        process.exit(1);
    }
}
check();
