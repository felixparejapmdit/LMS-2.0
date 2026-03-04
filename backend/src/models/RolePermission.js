const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RolePermission = sequelize.define('RolePermission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    role_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    page_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    can_view: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    can_create: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    can_edit: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    can_delete: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    can_special: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    field_permissions: {
        type: DataTypes.JSON,
        defaultValue: {}
    }
}, {
    tableName: 'role_permissions',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['role_id', 'page_name']
        }
    ]
});

module.exports = RolePermission;
