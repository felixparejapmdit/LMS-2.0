const db = require('./src/config/db.js');
async function migrateLetterTrays() {
    try {
        // Find existing letters and their tray_no from the OLD trays table
        const [oldLinks] = await db.query("SELECT letter, tray_no FROM trays");
        console.log(`Found ${oldLinks.length} old links.`);

        for (const link of oldLinks) {
            // Find the ID of the new ref_trays record
            const [ref] = await db.query(`SELECT id FROM ref_trays WHERE tray_no='${link.tray_no}'`);
            if (ref.length > 0) {
                await db.query(`UPDATE letters SET tray_id=${ref[0].id} WHERE id=${link.letter}`);
                console.log(`Updated letter ${link.letter} with tray_id ${ref[0].id}`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
migrateLetterTrays();
