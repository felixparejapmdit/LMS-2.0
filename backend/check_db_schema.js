const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../directus/database/data.db'),
    logging: false
});

async function checkTables() {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const tables = ['letters', 'letter_assignments', 'ref_attachments'];

        for (const table of tables) {
            console.log(`\nChecking ${table}:`);
            const definition = await queryInterface.describeTable(table);
            Object.keys(definition).forEach(col => {
                console.log(`- ${col}`);
            });
        }
        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
}

checkTables();
