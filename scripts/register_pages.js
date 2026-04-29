const path = require('path');
const fs = require('fs');

// Dynamic path resolution for Docker vs Host
const dbPath = fs.existsSync(path.join(__dirname, '../src/config/db.js')) 
    ? '../src/config/db' 
    : '../backend/src/config/db';

const sequelize = require(dbPath);
const { SystemPage } = require('../backend/src/models/associations'); // Associations loads everything properly

async function run() {
    try {
        console.log('Checking Section Registry registration...');
        
        const [page, created] = await SystemPage.findOrCreate({
            where: { page_id: 'sections' },
            defaults: {
                page_name: 'Section Registry',
                description: 'Management of global section codes pool'
            }
        });

        if (created) {
            console.log('Section Registry successfully registered in system_pages.');
        } else {
            console.log('Section Registry already registered.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error during registration:', error.message);
        process.exit(1);
    }
}

run();
