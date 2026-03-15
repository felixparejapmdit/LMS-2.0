const sqlite3 = require('./backend/node_modules/sqlite3').verbose();

const db = new sqlite3.Database('directus/database/data.db');

db.serialize(() => {
  db.get("SELECT id FROM ref_statuses WHERE status_name = 'ATG Note'", (err, row) => {
    if (err) {
      console.error(err.message);
      process.exit(1);
    }
    const atgId = row?.id;
    if (!atgId) {
      console.log('No ATG Note status found.');
      db.close();
      return;
    }

    db.run(
      "UPDATE letters SET tray_id = 0 WHERE global_status = ? AND tray_id != 0",
      [atgId],
      function (updateErr) {
        if (updateErr) {
          console.error(updateErr.message);
        } else {
          console.log(`Updated ${this.changes} letter(s) to tray_id 0.`);
        }
        db.close();
      }
    );
  });
});
