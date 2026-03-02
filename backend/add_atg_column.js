const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../directus/database/data.db'),
    logging: true
});

async function addAtgColumn() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();

        const queryInterface = sequelize.getQueryInterface();
        const table = 'letters';

        console.log(`Checking columns in ${table}...`);
        const tableDefinition = await queryInterface.describeTable(table);

        if (!tableDefinition.show_atg) {
            console.log(`Adding show_atg to ${table}...`);
            await queryInterface.addColumn(table, 'show_atg', {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: false
            });
        }

        console.log('Column update complete.');
        process.exit(0);
    } catch (error) {
        console.error('Column update failed:', error);
        process.exit(1);
    }
}

addAtgColumn();
