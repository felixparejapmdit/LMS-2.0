const db = require('./src/config/db.js');
db.query("PRAGMA table_info(directus_access)")
    .then(res => console.log(res[0]))
    .catch(console.error)
    .finally(() => process.exit(0));
