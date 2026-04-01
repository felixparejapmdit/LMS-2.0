const sequelize = require('./src/config/db');

async function run() {
    try {
        const [results] = await sequelize.query("SELECT * FROM sqlite_sequence WHERE name='letters';");
        console.log("SQLITE SEQUENCE:", JSON.stringify(results, null, 2));
        
        const [maxId] = await sequelize.query("SELECT MAX(id) as max FROM letters;");
        console.log("MAX ID:", JSON.stringify(maxId, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
