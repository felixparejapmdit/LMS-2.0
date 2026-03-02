const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Letter = sequelize.define('Letter', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    lms_id: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    entry_id: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    date_received: {
        type: DataTypes.DATE,
        allowNull: false
    },
    sender: {
        type: DataTypes.STRING,
        allowNull: false
    },
    summary: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    kind: {
        type: DataTypes.INTEGER
    },
    global_status: {
        type: DataTypes.INTEGER
    },
    encoder_id: {
        type: DataTypes.UUID
    },
    direction: {
        type: DataTypes.ENUM('Incoming', 'Outgoing'),
        defaultValue: 'Incoming'
    },
    letter_type: {
        type: DataTypes.ENUM('Confidential', 'Non-Confidential'),
        defaultValue: 'Non-Confidential'
    },
    vemcode: {
        type: DataTypes.STRING
    },
    evemnote: {
        type: DataTypes.TEXT
    },
    aevmnote: {
        type: DataTypes.TEXT
    },
    atgnote: {
        type: DataTypes.TEXT
    },
    scanned_copy: {
        type: DataTypes.STRING
    },
    tray_id: {
        type: DataTypes.INTEGER
    },
    attachment_id: {
        type: DataTypes.INTEGER
    },
    show_atg: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'letters',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Letter;
