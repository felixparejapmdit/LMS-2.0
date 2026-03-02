const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LetterAssignment = sequelize.define('LetterAssignment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    letter_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    department_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    step_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    assigned_by: {
        type: DataTypes.UUID
    },
    status_id: {
        type: DataTypes.INTEGER,
        defaultValue: 8
    },
    status: {
        type: DataTypes.STRING
    },
    endorsed: {
        type: DataTypes.ENUM('Yes', 'No', 'Pending'),
        defaultValue: 'Pending'
    },
    due_date: {
        type: DataTypes.DATE
    },
    remarks: {
        type: DataTypes.TEXT
    },
    completed_at: {
        type: DataTypes.DATE
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'letter_assignments',
    timestamps: false
});

module.exports = LetterAssignment;
