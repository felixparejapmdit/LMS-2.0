const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LinkLetter = sequelize.define('LinkLetter', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    main_letter_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    attached_letter_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    relation_type: {
        type: DataTypes.ENUM('Attachment', 'Reference', 'Response'),
        allowNull: false
    }
}, {
    tableName: 'link_letters',
    timestamps: false
});

module.exports = LinkLetter;
