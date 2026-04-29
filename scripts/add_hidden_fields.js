const path = require('path');
const fs = require('fs');

// Dynamic path resolution for Docker vs Host
const dbPath = fs.existsSync(path.join(__dirname, '../src/config/db.js')) 
    ? '../src/config/db' 
    : '../backend/src/config/db';

const sequelize = require(dbPath);

async function run() {
    try {
        console.log('Adding is_hidden column to letters...');
        try {
            await sequelize.query('ALTER TABLE letters ADD COLUMN is_hidden BOOLEAN DEFAULT 0');
            console.log('is_hidden column added successfully.');
        } catch (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('is_hidden column already exists.');
            } else {
                throw err;
            }
        }
        
        console.log('Adding authorized_users column to letters...');
        try {
            await sequelize.query('ALTER TABLE letters ADD COLUMN authorized_users TEXT');
            console.log('authorized_users column added successfully.');
        } catch (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('authorized_users column already exists.');
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
