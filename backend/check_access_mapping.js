const sequelize = require('./src/config/db');

async function checkAccess() {
    try {
        console.log('--- Checking directus_access ---');
        const [access] = await sequelize.query(`SELECT * FROM directus_access`);
        console.log(JSON.stringify(access, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkAccess();
