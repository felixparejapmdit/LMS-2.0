const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'directus/database/data.db');
const db = new sqlite3.Database(dbPath);

db.all(`SELECT * FROM letters`, (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
