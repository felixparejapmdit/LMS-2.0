const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Person = sequelize.define('Person', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'LMS ID from letters'
    },
    area: {
        type: DataTypes.STRING,
        allowNull: true
    },
    telegram: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'telegram_id'
    }
}, {
    tableName: 'person',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Person;
