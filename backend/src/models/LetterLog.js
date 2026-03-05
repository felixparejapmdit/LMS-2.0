const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LetterLog = sequelize.define('LetterLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    letter_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: true
    },
    action_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'System'
    },
    department_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    log_details: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: 'Legacy record'
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    action_taken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    log_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'letter_logs',
    timestamps: false
});

module.exports = LetterLog;
