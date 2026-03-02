const sequelize = require('./src/config/db');

async function checkPolicies() {
    try {
        console.log('--- Checking directus_policies ---');
        const [policies] = await sequelize.query(`SELECT * FROM directus_policies`);
        console.log(JSON.stringify(policies, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkPolicies();
