const { User } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function fixEmails() {
    try {
        await sequelize.authenticate();

        // Update any email ending in @lms.local to @lms-app.com
        const [updated] = await sequelize.query(`
            UPDATE directus_users 
            SET email = REPLACE(email, '@lms.local', '@lms-app.com')
            WHERE email LIKE '%@lms.local'
        `);

        console.log(`Successfully fixed email formats for imported users.`);
    } catch (e) {
        console.error("Error fixing emails:", e.message);
    } finally {
        process.exit();
    }
}

fixEmails();
