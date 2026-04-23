const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Status = sequelize.define('Status', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    status_name: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'ref_statuses',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['status_name']
        }
    ]
});

module.exports = Status;
