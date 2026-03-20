const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const db1 = new sqlite3.Database('directus/database/data.db');
const db2 = new sqlite3.Database('directus/database/data_corrupt_v2.db');

db1.all('SELECT count(*) as c FROM letters', (e, r) => console.log('Current Letters count:', r?.[0]?.c));
db2.all('SELECT count(*) as c FROM letters', (e, r) => console.log('Backup Letters count:', r?.[0]?.c));
// No need to close explicitly if it's a one-off and node will terminate
