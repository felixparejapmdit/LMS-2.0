const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../directus/database/data.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows.map(r => r.name), null, 2));
});
