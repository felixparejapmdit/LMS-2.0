const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../directus/database/data.db');

db.all('SELECT id, step_name FROM ref_process_steps', [], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
});
