const sequelize = require('./src/config/db');
const { DataTypes } = require('sequelize');

async function run() {
    try {
        console.log('Adding interdepartment column to directus_users...');
        await sequelize.query('ALTER TABLE directus_users ADD COLUMN interdepartment BOOLEAN DEFAULT 0').catch(e => console.log('Column might already exist:', e.message));
        
        console.log('Creating user_dept_access table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS user_dept_access (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                department_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, department_id)
            )
        `);
        console.log('Database updated successfully.');
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL Error:', error.message);
        process.exit(1);
    }
}

run();
