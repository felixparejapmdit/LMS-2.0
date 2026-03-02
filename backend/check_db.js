const sequelize = require('./src/config/db');

async function checkTables() {
    try {
        const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('--- DATABASE TABLES ---');
        results.forEach(row => console.log(row.name));

        const [collections] = await sequelize.query("SELECT collection FROM directus_collections");
        console.log('\n--- DIRECTUS COLLECTIONS ---');
        collections.forEach(row => console.log(row.collection));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkTables();
