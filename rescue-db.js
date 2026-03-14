const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const path = require('path');
const fs = require('fs');

async function rescue() {
    const corruptPath = path.resolve(__dirname, 'directus/database/data.db');
    const rescuePath = path.resolve(__dirname, 'directus/database/data_rescued.db');

    if (fs.existsSync(rescuePath)) fs.unlinkSync(rescuePath);

    console.log('Attempting to rescue data from corruption...');
    console.log('Source:', corruptPath);
    console.log('Target:', rescuePath);

    const corruptDb = new sqlite3.Database(corruptPath);
    const rescueDb = new sqlite3.Database(rescuePath);

    // Get all tables
    corruptDb.all("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tables) => {
        if (err) {
            console.error('Failed to read database schema. Corruption might be too deep.');
            process.exit(1);
        }

        console.log(`Found ${tables.length} potential tables to rescue.`);

        rescueDb.serialize(() => {
            let processed = 0;

            tables.forEach((table) => {
                // Skip internal directus migration locks as they often cause issues during repair
                if (table.name === 'directus_migrations') return;

                rescueDb.run(table.sql, (err) => {
                    if (err) {
                        console.error(`[FAIL] Could not recreate table structure for ${table.name}`);
                        return;
                    }

                    corruptDb.all(`SELECT * FROM ${table.name}`, (err, rows) => {
                        if (err) {
                            console.error(`[FAIL] Could not read data from ${table.name}`);
                        } else if (rows.length > 0) {
                            const keys = Object.keys(rows[0]);
                            const placeholders = keys.map(() => '?').join(',');
                            const columns = keys.map(k => `"${k}"`).join(',');

                            const stmt = rescueDb.prepare(`INSERT INTO "${table.name}" (${columns}) VALUES (${placeholders})`);

                            let errors = 0;
                            rows.forEach(row => {
                                stmt.run(Object.values(row), (e) => { if (e) errors++; });
                            });
                            stmt.finalize();
                            console.log(`[OK] Rescued ${rows.length} rows from ${table.name} (${errors} skips)`);
                        } else {
                            console.log(`[OK] Rescued empty table ${table.name}`);
                        }
                    });
                });
            });
        });
    });
}

rescue();
