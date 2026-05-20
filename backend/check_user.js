const db = require('./src/config/db.js');
db.query("SELECT id, first_name, last_name, email, username, password, status, role FROM directus_users WHERE username='felix.pareja' OR email='felixpareja07@gmail.com'")
    .then(res => console.log(res[0]))
    .catch(console.error)
    .finally(() => process.exit(0));
