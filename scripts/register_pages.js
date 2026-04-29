const path = require('path');
const fs = require('fs');

// Dynamic path resolution for Docker vs Host
const isDocker = fs.existsSync(path.join(__dirname, '../src/config/db.js'));
const dbPath = isDocker ? '../src/config/db' : '../backend/src/config/db';
const associationsPath = isDocker ? '../src/models/associations' : '../backend/src/models/associations';

const sequelize = require(dbPath);
const { SystemPage } = require(associationsPath);

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
