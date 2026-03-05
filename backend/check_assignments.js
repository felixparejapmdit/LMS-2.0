const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../directus/database/data.db');

db.all('SELECT * FROM letter_assignments', [], (err, rows) => {
    console.log(JSON.stringify(rows, null, 2));
});
