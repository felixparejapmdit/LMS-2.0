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
    action_taken: {
        type: DataTypes.STRING,
        allowNull: false
    },
    log_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    metadata: {
        type: DataTypes.JSON
    }
}, {
    tableName: 'letter_logs',
    timestamps: false
});

module.exports = LetterLog;
