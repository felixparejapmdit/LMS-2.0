const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../../directus/database/data.db'),
    logging: false,
    dialectOptions: {
        // Simple mode for cross-platform compatibility
        mode: 2,
    }
});

module.exports = sequelize;
