
const { Status } = require('./backend/src/models/associations');
const sequelize = require('./backend/src/config/db');

async function check() {
    try {
        await sequelize.authenticate();
        const statuses = await Status.findAll();
        console.log('Statuses in DB:', JSON.stringify(statuses, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

check();
