const { Status } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function run() {
    try {
        const statuses = await Status.findAll();
        console.log("STATUSES:", JSON.stringify(statuses, null, 2));
        const steps = await (require('./src/models/ProcessStep')).findAll();
        console.log("STEPS:", JSON.stringify(steps, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
