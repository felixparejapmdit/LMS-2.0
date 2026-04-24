const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RefSectionRegistry = sequelize.define('RefSectionRegistry', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    section_code: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('AVAILABLE', 'ACTIVE', 'FULL'),
        defaultValue: 'AVAILABLE'
    },
    assigned_to_dept_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'ref_sections_registry',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = RefSectionRegistry;
