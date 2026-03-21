const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Attachment = sequelize.define('Attachment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    attachment_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    file_path: {
        type: DataTypes.STRING,
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT
    },
    dept_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'ref_attachments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Attachment;
