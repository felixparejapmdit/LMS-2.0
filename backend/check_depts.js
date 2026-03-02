const sequelize = require('./src/config/db');

async function checkDepts() {
    try {
        const [results] = await sequelize.query("SELECT id, dept_name FROM ref_departments");
        console.log('--- DEPARTMENTS ---');
        results.forEach(row => console.log(JSON.stringify(row)));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkDepts();
