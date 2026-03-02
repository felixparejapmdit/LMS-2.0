const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProcessStep = sequelize.define('ProcessStep', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    step_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    dept_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'ref_process_steps',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['step_name', 'dept_id']
        }
    ]
});

module.exports = ProcessStep;
