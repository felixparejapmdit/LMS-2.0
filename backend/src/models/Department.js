const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Department = sequelize.define('Department', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    dept_name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    dept_code: {
        type: DataTypes.STRING,
        unique: true
    }
}, {
    tableName: 'ref_departments',
    timestamps: false
});

module.exports = Department;
