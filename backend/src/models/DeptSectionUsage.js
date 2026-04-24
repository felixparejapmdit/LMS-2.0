const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DeptSectionUsage = sequelize.define('DeptSectionUsage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    dept_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    section_code: {
        type: DataTypes.STRING,
        allowNull: false
    },
    current_sequence: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    filled_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'dept_section_usage',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = DeptSectionUsage;
