const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LetterKind = sequelize.define('LetterKind', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    kind_name: {
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
    tableName: 'ref_letter_kinds',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['kind_name', 'dept_id']
        }
    ]
});

module.exports = LetterKind;
