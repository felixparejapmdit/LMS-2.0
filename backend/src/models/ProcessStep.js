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
    }
}, {
    tableName: 'ref_process_steps',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['step_name']
        }
    ]
});

module.exports = ProcessStep;
