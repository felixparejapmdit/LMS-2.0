const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.STRING, allowNull: true },
    user_name: { type: DataTypes.STRING, allowNull: true },
    action: { type: DataTypes.STRING, allowNull: false, defaultValue: 'LOGIN' },
    ip_address: { type: DataTypes.STRING, allowNull: true },
    browser: { type: DataTypes.STRING, allowNull: true },
    device_os: { type: DataTypes.STRING, allowNull: true },
    details: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = AuditLog;
