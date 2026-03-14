const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const path = require('path');

async function nukeLetters() {
    const dbPath = path.resolve(__dirname, 'directus/database/data.db');
    console.log('Targeting database:', dbPath);

    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Failed to connect to database:', err.message);
            return;
        }
        console.log('Connected to database.');

        const tables = [
            'letter_logs',
            'letter_assignments',
            'comments',
            'link_letters',
            'endorsements',
            'letters'
        ];

        db.serialize(() => {
            // Disable foreign keys temporarily if they exist
            db.run('PRAGMA foreign_keys = OFF');

            for (const table of tables) {
                db.run(`DROP TABLE IF EXISTS ${table}`, (err) => {
                    if (err) {
                        console.error(`Error dropping ${table}:`, err.message);
                    } else {
                        console.log(`Dropped table: ${table}`);
                    }
                });
            }

            db.run('PRAGMA foreign_keys = ON', () => {
                console.log('\nNuke complete. These tables will be recreated clean when the server restarts.');
                db.close();
            });
        });
    });
}

nukeLetters();
