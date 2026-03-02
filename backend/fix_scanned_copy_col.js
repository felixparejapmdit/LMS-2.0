const sequelize = require('./src/config/db');

async function fixColumn() {
    try {
        console.log('Fixing scanned_copy column...');

        // SQLite doesn't support changing column types easily, so we add a new one and copy if needed.
        // But since we want to "transfer" and change purpose, let's just make it STRING.

        await sequelize.query('ALTER TABLE letters RENAME COLUMN scanned_copy TO scanned_copy_old');
        await sequelize.query('ALTER TABLE letters ADD COLUMN scanned_copy VARCHAR(255)');

        console.log('scanned_copy column updated to VARCHAR(255)');

    } catch (error) {
        console.error('Fix failed:', error);
    } finally {
        process.exit();
    }
}

fixColumn();
