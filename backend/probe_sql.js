const sequelize = require('./src/config/db');

async function run() {
    try {
        const [results] = await sequelize.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='letters';");
        console.log("TABLE SQL:", results[0].sql);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
