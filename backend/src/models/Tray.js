const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Tray = sequelize.define('Tray', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tray_no: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    capacity: {
        type: DataTypes.INTEGER,
        defaultValue: 100
    },
    dept_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'ref_trays',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['tray_no', 'dept_id']
        }
    ]
});

module.exports = Tray;
