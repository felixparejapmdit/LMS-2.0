const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Comment = sequelize.define('Comment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    letter_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'letter'
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'user'
    },
    comment_body: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'comments',
    timestamps: false
});

module.exports = Comment;
