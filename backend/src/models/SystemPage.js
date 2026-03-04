const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SystemPage = sequelize.define('SystemPage', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    page_id: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    page_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'system_pages',
    timestamps: true
});

module.exports = SystemPage;
