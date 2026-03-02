const db = require('./src/config/db.js');
async function checkRefTables() {
    try {
        const tables = ['ref_letter_kinds', 'ref_statuses', 'ref_process_steps'];
        for (const t of tables) {
            const [results] = await db.query(`PRAGMA table_info(${t})`);
            console.log(`STRUCTURE OF ${t}:`);
            console.log(results.map(r => r.name));
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
checkRefTables();
