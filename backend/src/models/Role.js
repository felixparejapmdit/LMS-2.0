const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING
    },
    dept_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'directus_roles',
    timestamps: false
});

module.exports = Role;
