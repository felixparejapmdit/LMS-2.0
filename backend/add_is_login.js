const sequelize = require('./src/config/db');

async function addIsLoginColumn() {
    try {
        const [results] = await sequelize.query("PRAGMA table_info(directus_users)");
        const hasColumn = results.some(column => column.name === 'is_login');

        if (!hasColumn) {
            await sequelize.query("ALTER TABLE directus_users ADD COLUMN is_login BOOLEAN DEFAULT 0");
            console.log("Column 'is_login' added to directus_users.");
        } else {
            console.log("Column 'is_login' already exists.");
        }
    } catch (error) {
        console.error("Error adding column:", error);
    } finally {
        process.exit();
    }
}

addIsLoginColumn();
