const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../directus/database/data.db');

db.all('SELECT id, global_status, tray_id FROM letters WHERE id IN (24, 25, 27)', [], (err, rows) => {
    console.log(JSON.stringify(rows, null, 2));
});
