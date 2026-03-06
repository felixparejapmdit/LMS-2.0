const { Sequelize } = require('sequelize');
const path = require('path');

const defaultStorage = path.join(__dirname, '../../../directus/database/data.db');
const envStorage = process.env.DB_PATH;
const storage = envStorage
    ? (path.isAbsolute(envStorage) ? envStorage : path.resolve(__dirname, '../../../', envStorage))
    : defaultStorage;

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: false,
    pool: {
        // Keep a single sqlite writer connection to reduce lock contention.
        max: 1,
        min: 0,
        idle: 10000,
        acquire: 60000
    },
    dialectOptions: {
        // Simple mode for cross-platform compatibility
        mode: 2,
    }
});

module.exports = sequelize;
