const sequelize = require('./src/config/db');

async function migrate() {
    try {
        console.log('Adding new fields to letters table...');

        const columnsToAdd = [
            { name: 'letter_type', type: 'VARCHAR(255)' },
            { name: 'vemcode', type: 'VARCHAR(255)' },
            { name: 'evemnote', type: 'TEXT' },
            { name: 'aevmnote', type: 'TEXT' },
            { name: 'atgnote', type: 'TEXT' }
        ];

        for (const col of columnsToAdd) {
            try {
                await sequelize.query(`ALTER TABLE letters ADD COLUMN ${col.name} ${col.type}`);
                console.log(`Added column: ${col.name}`);
            } catch (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log(`Column ${col.name} already exists.`);
                } else {
                    console.warn(`Could not add column ${col.name}:`, err.message);
                }
            }
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
