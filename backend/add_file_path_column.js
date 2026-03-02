const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../directus/database/data.db'),
    logging: true
});

async function updateSchema() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();

        const queryInterface = sequelize.getQueryInterface();
        const table = 'ref_attachments';

        console.log(`Checking columns in ${table}...`);
        const tableDefinition = await queryInterface.describeTable(table);

        if (!tableDefinition.file_path) {
            console.log(`Adding file_path to ${table}...`);
            await queryInterface.addColumn(table, 'file_path', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (!tableDefinition.created_at) {
            console.log(`Adding created_at to ${table}...`);
            await queryInterface.addColumn(table, 'created_at', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        if (!tableDefinition.updated_at) {
            console.log(`Adding updated_at to ${table}...`);
            await queryInterface.addColumn(table, 'updated_at', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        console.log('Schema update complete.');
        process.exit(0);
    } catch (error) {
        console.error('Schema update failed:', error);
        process.exit(1);
    }
}

updateSchema();
