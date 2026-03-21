const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Endorsement = sequelize.define('Endorsement', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    letter_id: { type: DataTypes.INTEGER, allowNull: false },
    endorsed_to: { type: DataTypes.STRING, allowNull: false }, // person name from persons collection
    endorsed_by: { type: DataTypes.INTEGER, allowNull: true }, // user_id
    notes: { type: DataTypes.TEXT, allowNull: true },
    endorsed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    dept_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'endorsements',
    timestamps: false,
    underscored: true,
});

module.exports = Endorsement;
