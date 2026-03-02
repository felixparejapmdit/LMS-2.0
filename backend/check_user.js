const db = require('./src/config/db.js');
db.query("SELECT * FROM directus_users WHERE email='felixpareja07@gmail.com'")
    .then(res => console.log(res[0]))
    .catch(console.error)
    .finally(() => process.exit(0));
