const sequelize = require('./src/config/db');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log("Connected...");

        // Add columns if they don't exist
        await sequelize.query("ALTER TABLE directus_users ADD COLUMN layout_style VARCHAR(255) DEFAULT 'notion'");
        await sequelize.query("ALTER TABLE directus_users ADD COLUMN theme_preference VARCHAR(255) DEFAULT 'light'");

        console.log("Migration successful: added layout_style and theme_preference columns.");
    } catch (e) {
        console.log("Migration check:", e.message.includes('duplicate column name') ? "Columns already exist." : e.message);
    } finally {
        process.exit();
    }
}

migrate();
