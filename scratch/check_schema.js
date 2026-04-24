const sequelize = require('./backend/src/config/db');

async function checkSchema() {
    try {
        const [results] = await sequelize.query("PRAGMA table_info(letters)");
        console.log("Columns in 'letters' table:");
        results.forEach(col => {
            console.log(`- ${col.name} (${col.type})`);
        });
        process.exit(0);
    } catch (error) {
        console.error("Error checking schema:", error.message);
        process.exit(1);
    }
}

checkSchema();
