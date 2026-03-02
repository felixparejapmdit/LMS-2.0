const sequelize = require('./src/config/db');

async function checkPersonTable() {
    try {
        const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' and name='person'");
        console.log('--- DOES TABLE "person" EXIST? ---');
        console.log(results.length > 0 ? 'Yes' : 'No');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkPersonTable();
