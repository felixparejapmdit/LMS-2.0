const sequelize = require('../backend/src/config/db');

async function run() {
    try {
        console.log('Ensuring group_id column exists in ref_departments...');
        try {
            await sequelize.query('ALTER TABLE ref_departments ADD COLUMN group_id INTEGER DEFAULT 1');
            console.log('group_id column added successfully.');
        } catch (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('group_id column already exists.');
            } else {
                throw err;
            }
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

run();
