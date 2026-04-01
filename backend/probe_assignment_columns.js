const sequelize = require('./src/config/db');

async function run() {
    try {
        const [results] = await sequelize.query('PRAGMA table_info(letter_assignments);');
        console.log("COLUMNS:", JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
