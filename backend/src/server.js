
require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/db');
require('./models/associations'); // Initialize associations

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');

        // Sync models
        await sequelize.sync();

        // Self-Healing: Ensure Endorsement table exists (new feature)
        try {
            const Endorsement = require('./models/Endorsement');
            await Endorsement.sync({ alter: true });
            console.log('Endorsement table synced.');
        } catch (e) {
            console.warn('Endorsement sync warning:', e.message);
        }

        // Self-Healing: Ensure Person table is up to date
        try {
            const Person = require('./models/Person');
            await Person.sync({ alter: true });
            console.log('Person table synced.');
        } catch (e) {
            console.warn('Person sync warning:', e.message);
        }

        // Self-Healing: Ensure RolePermission table is up to date (field_permissions col)
        try {
            const RolePermission = require('./models/RolePermission');
            await RolePermission.sync({ alter: true });

            // Explicitly ensure unique index for SQLite
            try {
                await sequelize.query("CREATE UNIQUE INDEX IF NOT EXISTS role_page_unique ON role_permissions (role_id, page_name)");
            } catch (idxErr) {
                console.log('Index role_page_unique check: already exists or skipped');
            }

            console.log('RolePermission table synced.');
        } catch (e) {
            console.warn('RolePermission sync warning:', e.message);
        }

        // Self-Healing: Ensure layout columns exist in directus_users
        try {
            await sequelize.query("ALTER TABLE directus_users ADD COLUMN layout_style VARCHAR(255) DEFAULT 'notion'");
            console.log('Added missing layout_style column.');
        } catch (e) {
            if (!e.message.includes('duplicate column name')) console.log('Column check (layout_style): OK');
        }

        try {
            await sequelize.query("ALTER TABLE directus_users ADD COLUMN theme_preference VARCHAR(255) DEFAULT 'light'");
            console.log('Added missing theme_preference column.');
        } catch (e) {
            if (!e.message.includes('duplicate column name')) console.log('Column check (theme_preference): OK');
        }

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

startServer();
