const sequelize = require('./src/config/db');

async function checkCollections() {
    try {
        const [results] = await sequelize.query("SELECT * FROM directus_collections WHERE collection='ref_letter_kinds'");
        console.log('--- ref_letter_kinds in directus_collections ---');
        console.log(JSON.stringify(results[0], null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkCollections();
