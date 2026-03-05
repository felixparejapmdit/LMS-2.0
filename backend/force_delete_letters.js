/**
 * force_delete_letters.js
 * Deletes ALL rows from the letters table and every table that depends on it.
 * Runs inside the existing SQLite database via sequelize.
 * 
 * Dependent tables cleared (in order):
 *   endorsements → letter_assignments → letter_logs → comments → link_letters → letters
 */

const sequelize = require('./src/config/db');

async function forceDeleteLetters() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to SQLite database.');

        // Disable FK checks temporarily (SQLite pragma)
        await sequelize.query('PRAGMA foreign_keys = OFF;');

        const tables = [
            'endorsements',
            'letter_assignments',
            'letter_logs',
            'comments',
            'link_letters',
            'letters'
        ];

        for (const table of tables) {
            const [, meta] = await sequelize.query(`DELETE FROM \`${table}\`;`);
            console.log(`🗑️  Cleared table: ${table}`);
        }

        // Re-enable FK checks
        await sequelize.query('PRAGMA foreign_keys = ON;');

        console.log('\n✅ All letter-related data has been deleted successfully.');
    } catch (err) {
        console.error('❌ Error deleting letters data:', err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

forceDeleteLetters();
