const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const path = require('path');

async function checkIntegrity() {
    const dbPath = path.resolve(__dirname, 'directus/database/data.db');
    console.log('Checking database:', dbPath);

    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Failed to connect:', err.message);
            return;
        }

        db.get('PRAGMA integrity_check', (err, row) => {
            if (err) {
                console.error('Check failed:', err.message);
            } else {
                console.log('Integrity Result:', row.integrity_check);
                if (row.integrity_check !== 'ok') {
                    console.log('\n--- DETAILED ERRORS ---');
                    // Get more details
                    db.all('PRAGMA integrity_check(100)', (err, rows) => {
                        rows.forEach(r => console.log(r.integrity_check));
                        db.close();
                    });
                } else {
                    db.close();
                }
            }
        });
    });
}

checkIntegrity();
