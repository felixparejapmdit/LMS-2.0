const sequelize = require('./src/config/db');

async function checkAppAccess() {
    try {
        console.log('--- Checking Role App Access ---');
        const [results] = await sequelize.query(`
            SELECT id, name, parent, policies 
            FROM directus_roles 
            WHERE id = 'ec986bba-2c97-47a8-968f-f8a163e5f014'
        `);
        console.log(JSON.stringify(results, null, 2));

        console.log('--- Checking User ---');
        const [users] = await sequelize.query(`
            SELECT id, email, role, status
            FROM directus_users 
            WHERE email = 'admin@example.com'
        `);
        console.log(JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkAppAccess();
