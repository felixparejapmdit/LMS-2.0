const sequelize = require('./src/config/db');

async function checkFields() {
    try {
        const [results] = await sequelize.query("SELECT DISTINCT collection FROM directus_fields");
        console.log('--- COLLECTIONS WITH DEFINED FIELDS ---');
        results.forEach(row => console.log(row.collection));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkFields();
