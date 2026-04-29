const path = require('path');
const fs = require('fs');

// Dynamic path resolution for Docker vs Host
const dbPath = fs.existsSync(path.join(__dirname, '../src/config/db.js')) 
    ? '../src/config/db' 
    : '../backend/src/config/db';

const sequelize = require(dbPath);

async function run() {
    try {
        console.log('Creating ref_sections_registry table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS ref_sections_registry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                section_code TEXT UNIQUE NOT NULL,
                status TEXT DEFAULT 'AVAILABLE', -- AVAILABLE, ACTIVE, FULL
                assigned_to_dept_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating dept_section_usage table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS dept_section_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dept_id INTEGER NOT NULL,
                section_code TEXT NOT NULL,
                current_sequence INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                filled_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Seed ref_sections_registry if empty
        const [sections] = await sequelize.query('SELECT count(*) as count FROM ref_sections_registry');
        if (sections[0].count === 0) {
            console.log('Seeding ref_sections_registry with 01-99...');
            for (let i = 1; i <= 99; i++) {
                const code = i.toString().padStart(2, '0');
                await sequelize.query('INSERT INTO ref_sections_registry (section_code) VALUES (?)', {
                    replacements: [code]
                });
            }
            console.log('Seeding complete.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

run();
