const sequelize = require('./src/config/db');

async function checkPermissions(collection) {
    try {
        const [results] = await sequelize.query(`SELECT * FROM directus_permissions WHERE collection='${collection}'`);
        console.log(`--- PERMISSIONS IN ${collection} ---`);
        results.forEach(row => console.log(JSON.stringify(row, null, 2)));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkPermissions('ref_letter_kinds');
