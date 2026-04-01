const sequelize = require('./src/config/db');

async function run() {
    try {
        const [results] = await sequelize.query("PRAGMA foreign_key_list(letters);");
        console.log("FOREIGN KEYS:", JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
