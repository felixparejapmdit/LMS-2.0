const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const path = require('path');

const table = process.argv[2] || 'letters';
const dbPath = path.resolve(__dirname, 'directus/database/data.db');
const db = new sqlite3.Database(dbPath);

console.log('Columns in', table, ':');
db.all(`PRAGMA table_info("${table}")`, (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(rows.map(r => r.name));
    db.close();
});
