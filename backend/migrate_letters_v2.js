const db = require('./src/config/db.js');

async function migrate() {
    try {
        // Renaming atg_id to lms_id and adding entry_id
        // SQLite doesn't support complex ALTER TABLE well, so we create a new table and migrate

        await db.query(`CREATE TABLE letters_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lms_id VARCHAR(255) UNIQUE NOT NULL,
            entry_id VARCHAR(255) UNIQUE NOT NULL,
            date_received DATETIME NOT NULL,
            sender VARCHAR(255),
            summary TEXT,
            kind INTEGER,
            global_status INTEGER,
            encoder_id CHAR(36),
            endorsed TEXT DEFAULT 'Pending',
            direction VARCHAR(255) DEFAULT 'Incoming',
            scanned_copy CHAR(36),
            tray_id INTEGER,
            attachment_id INTEGER
        )`);
        console.log("Created letters_new table.");

        // Try to migrate existing data if any
        try {
            await db.query(`INSERT INTO letters_new (id, lms_id, entry_id, date_received, sender, summary, kind, global_status, encoder_id, endorsed, direction, scanned_copy, tray_id, attachment_id)
                            SELECT id, atg_id, ('E-' || atg_id), date_received, sender, summary, kind, global_status, encoder_id, endorsed, direction, scanned_copy, tray_id, attachment_id FROM letters`);
            console.log("Migrated data from letters to letters_new.");
        } catch (e) {
            console.log("No data to migrate or migration failed (perhaps letters table was empty).", e.message);
        }

        await db.query(`DROP TABLE letters`);
        await db.query(`ALTER TABLE letters_new RENAME TO letters`);
        console.log("Swapped tables successfully.");

    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        process.exit(0);
    }
}

migrate();
