const { Status } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function checkStatuses() {
    try {
        await sequelize.authenticate();
        const statuses = await Status.findAll();
        console.log("Existing statuses:", JSON.stringify(statuses, null, 2));
    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit(0);
    }
}

checkStatuses();
