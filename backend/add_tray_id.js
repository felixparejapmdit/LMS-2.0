const db = require('./src/config/db.js');
async function addTrayId() {
    try {
        await db.query("ALTER TABLE letters ADD COLUMN tray_id INTEGER REFERENCES ref_trays(id)");
        console.log("tray_id added to letters.");
    } catch (err) {
        console.log("tray_id might already exist or error:", err.message);
    } finally {
        process.exit(0);
    }
}
addTrayId();
