const sequelize = require('./src/config/db');

async function fixSchema() {
    try {
        console.log('Starting advanced schema recovery...');

        // Add timestamps to letters without default first
        await sequelize.query(`ALTER TABLE letters ADD COLUMN created_at DATETIME;`).catch(() => { });
        await sequelize.query(`ALTER TABLE letters ADD COLUMN updated_at DATETIME;`).catch(() => { });

        // Rename columns in letter_assignments if they use old Directus names
        // SQLite doesn't support RENAME COLUMN in some versions, so we use a safe query
        const tables = ['letter_assignments', 'letter_logs'];

        for (const table of tables) {
            const info = await sequelize.query(`PRAGMA table_info(${table})`);
            const columns = info[0].map(c => c.name);

            if (table === 'letter_assignments') {
                if (columns.includes('letter') && !columns.includes('letter_id')) {
                    await sequelize.query(`ALTER TABLE letter_assignments RENAME COLUMN "letter" TO "letter_id"`);
                }
                if (columns.includes('department') && !columns.includes('department_id')) {
                    await sequelize.query(`ALTER TABLE letter_assignments RENAME COLUMN "department" TO "department_id"`);
                }
                if (columns.includes('step') && !columns.includes('step_id')) {
                    await sequelize.query(`ALTER TABLE letter_assignments RENAME COLUMN "step" TO "step_id"`);
                }
            }

            if (table === 'letter_logs' && columns.includes('letter') && !columns.includes('letter_id')) {
                await sequelize.query(`ALTER TABLE letter_logs RENAME COLUMN "letter" TO "letter_id"`);
            }
            if (table === 'letter_logs' && columns.includes('user') && !columns.includes('user_id')) {
                await sequelize.query(`ALTER TABLE letter_logs RENAME COLUMN "user" TO "user_id"`);
            }
        }

        console.log('Final check of letters table...');
        await sequelize.query(`UPDATE letters SET created_at = datetime('now') WHERE created_at IS NULL`);
        await sequelize.query(`UPDATE letters SET updated_at = datetime('now') WHERE updated_at IS NULL`);

        console.log('Recovery complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

fixSchema();
