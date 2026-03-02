const sequelize = require('./src/config/db');

async function checkMetadata(collection) {
    try {
        const [results] = await sequelize.query(`SELECT * FROM directus_fields WHERE collection='${collection}'`);
        console.log(`--- FIELDS IN ${collection} ---`);
        results.forEach(row => console.log(JSON.stringify(row)));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkMetadata('ref_letter_kinds');
