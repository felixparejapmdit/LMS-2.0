const sequelize = require('./src/config/db');

async function fixSchema() {
    try {
        console.log('Starting schema fix for Pluggable DNA...');

        const tables = [
            { name: 'ref_process_steps', col: 'step_name' },
            { name: 'ref_letter_kinds', col: 'kind_name' },
            { name: 'ref_statuses', col: 'status_name' },
            { name: 'ref_trays', col: 'tray_no' }
        ];

        for (const table of tables) {
            console.log(`Fixing table: ${table.name}`);

            // 1. Get existing records
            const [rows] = await sequelize.query(`SELECT * FROM ${table.name}`);

            // 2. Drop the old table
            await sequelize.query(`DROP TABLE ${table.name}`);

            // 3. Recreate the table with composite unique constraint
            // We define the schema manually here to match the models
            let createQuery = '';
            if (table.name === 'ref_process_steps') {
                createQuery = `
                    CREATE TABLE ref_process_steps (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        step_name TEXT NOT NULL,
                        description TEXT,
                        dept_id INTEGER,
                        UNIQUE(step_name, dept_id)
                    )
                `;
            } else if (table.name === 'ref_letter_kinds') {
                createQuery = `
                    CREATE TABLE ref_letter_kinds (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        kind_name TEXT NOT NULL,
                        description TEXT,
                        dept_id INTEGER,
                        UNIQUE(kind_name, dept_id)
                    )
                `;
            } else if (table.name === 'ref_statuses') {
                createQuery = `
                    CREATE TABLE ref_statuses (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        status_name TEXT NOT NULL,
                        dept_id INTEGER,
                        UNIQUE(status_name, dept_id)
                    )
                `;
            } else if (table.name === 'ref_trays') {
                createQuery = `
                    CREATE TABLE ref_trays (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        tray_no TEXT NOT NULL,
                        description TEXT,
                        capacity INTEGER DEFAULT 100,
                        dept_id INTEGER,
                        UNIQUE(tray_no, dept_id)
                    )
                `;
            }

            await sequelize.query(createQuery);
            console.log(`Recreated ${table.name} with composite UNIQUE(name, dept_id)`);

            // 4. Restore data
            for (const row of rows) {
                const cols = Object.keys(row).join(', ');
                const placeholders = Object.keys(row).map(() => '?').join(', ');
                const values = Object.values(row);
                await sequelize.query(`INSERT INTO ${table.name} (${cols}) VALUES (${placeholders})`, {
                    replacements: values
                });
            }
            console.log(`Restored ${rows.length} records to ${table.name}`);
        }

        console.log('Schema fix completed successfully!');
    } catch (error) {
        console.error('Schema fix failed:', error);
    } finally {
        await sequelize.close();
    }
}

fixSchema();
