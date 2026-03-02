const db = require('./src/config/db.js');
db.query("SELECT * FROM directus_policies")
    .then(res => console.log(res[0]))
    .catch(console.error)
    .finally(() => process.exit(0));
