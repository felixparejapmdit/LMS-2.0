const sequelize = require('./src/config/db');

async function fixAdminAccess() {
    try {
        console.log("Restoring admin access policy to the Administrator role...");
        // Link the "Administrator" role to the "Administrator" policy (which grants App Access and Admin Access)
        await sequelize.query(`
            INSERT INTO directus_access (id, role, policy, sort)
            VALUES ('admin-access-1', 'ec986bba-2c97-47a8-968f-f8a163e5f014', '033fe4eb-5c8e-4b58-85fe-0a33de46434c', 2)
        `);
        console.log("Access restored successfully.");
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            console.log("Access already exists. Attempting update just in case.");
            await sequelize.query(`
                UPDATE directus_access 
                SET role = 'ec986bba-2c97-47a8-968f-f8a163e5f014', policy = '033fe4eb-5c8e-4b58-85fe-0a33de46434c'
                WHERE id = 'admin-access-1'
            `);
        } else {
            console.error('Error:', error);
        }
    } finally {
        process.exit();
    }
}

fixAdminAccess();
