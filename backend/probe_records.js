const sequelize = require('./src/config/db');

async function run() {
    try {
        const [results] = await sequelize.query("SELECT id, lms_id, entry_id FROM letters ORDER BY id DESC LIMIT 5;");
        console.log("LAST RECORDS:", JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
