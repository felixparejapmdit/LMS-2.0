const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UserDeptAccess = sequelize.define('UserDeptAccess', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    department_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'user_dept_access',
    timestamps: false
});

module.exports = UserDeptAccess;
