const sequelize = require('./src/config/db');

async function run() {
    try {
        const [results] = await sequelize.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='letters';");
        const sql = results[0].sql;
        // Use multiple console logs to avoid truncation
        for (let i = 0; i < sql.length; i += 1000) {
            console.log(sql.substring(i, i + 1000));
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
