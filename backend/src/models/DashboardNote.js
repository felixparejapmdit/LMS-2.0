const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DashboardNote = sequelize.define('DashboardNote', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    priority: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
        defaultValue: 'LOW'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'dashboard_notes',
    timestamps: true
});

module.exports = DashboardNote;
