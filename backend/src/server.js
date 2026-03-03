
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

        // Self-Healing: Ensure layout columns exist
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
