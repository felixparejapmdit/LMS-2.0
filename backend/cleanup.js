const sequelize = require('./src/config/db');

async function clean() {
    try {
        console.log("Cleaning up backup tables...");
        await sequelize.query('DROP TABLE IF EXISTS person_backup');
        await sequelize.query('DROP TABLE IF EXISTS directus_users_backup');
        await sequelize.query('DROP TABLE IF EXISTS role_permissions_backup');
        console.log("Cleanup successful.");
    } catch (e) {
        console.error("Cleanup failed:", e.message);
    }
    process.exit();
}
clean();
