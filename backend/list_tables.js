const db = require('./src/config/db.js');
async function listTables() {
    try {
        const [results] = await db.query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log(results.map(r => r.name));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
listTables();
