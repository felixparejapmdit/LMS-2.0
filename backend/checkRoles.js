const { Role } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function listRoles() {
    try {
        await sequelize.authenticate();
        const roles = await Role.findAll();
        console.log("ROLES IN DB:");
        console.log(JSON.stringify(roles, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

listRoles();
