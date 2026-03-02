const db = require('./src/config/db.js');
async function migrateTrays() {
    try {
        await db.query(`CREATE TABLE IF NOT EXISTS ref_trays (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tray_no VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            capacity INTEGER DEFAULT 100
        )`);
        console.log("ref_trays table created.");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
migrateTrays();
