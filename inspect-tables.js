const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'directus/database/data.db');
const db = new sqlite3.Database(dbPath);

console.log('--- TABLE STRUCTURES ---');

db.all("PRAGMA table_info(letters)", (err, rows) => {
    if (err) console.error(err);
    console.log('\n- letters Table:');
    rows.forEach(r => console.log(`${r.name} (${r.type}${r.pk ? ', PK' : ''}${r.notnull ? ', NOT NULL' : ''})`));

    db.all("PRAGMA table_info(letter_assignments)", (err, rows) => {
        if (err) console.error(err);
        console.log('\n- letter_assignments Table:');
        rows.forEach(r => console.log(`${r.name} (${r.type}${r.pk ? ', PK' : ''}${r.notnull ? ', NOT NULL' : ''})`));

        console.log('\n--- SAMPLE DATA (letters) ---');
        db.all("SELECT * FROM letters LIMIT 2", (err, rows) => {
            if (err) console.error(err);
            console.log(JSON.stringify(rows, null, 2));

            console.log('\n--- SAMPLE DATA (letter_assignments) ---');
            db.all("SELECT * FROM letter_assignments LIMIT 2", (err, rows) => {
                if (err) console.error(err);
                console.log(JSON.stringify(rows, null, 2));
                db.close();
            });
        });
    });
});
