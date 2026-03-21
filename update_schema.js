const sequelize = require('./backend/src/config/db');
const { DataTypes } = require('sequelize');

async function run() {
    try {
        console.log('Adding interdepartment column to directus_users...');
        await sequelize.query('ALTER TABLE directus_users ADD COLUMN interdepartment BOOLEAN DEFAULT 0');
        console.log('Column added successfully.');
        
        console.log('Creating UserDeptAccess table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS user_dept_access (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                department_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, department_id)
            )
        `);
        console.log('Table created successfully.');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

run();
