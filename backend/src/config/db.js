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
        max: 20, // Allowing concurrent reads (essential for WAL mode performance)
        min: 1,
        idle: 10000,
        acquire: 60000
    },
    dialectOptions: {
        // Set the busy timeout directly in the driver options
        timeout: 15000,
        mode: 2 // read/write/create
    }
});

// Use hooks to ensure PRAGMAs are set on every connection
sequelize.addHook('afterConnect', async (connection, config) => {
    const journalMode = process.env.SQLITE_JOURNAL_MODE || 'WAL';
    const synchronous = process.env.SQLITE_SYNCHRONOUS || 'NORMAL';
    const busyTimeout = process.env.SQLITE_BUSY_TIMEOUT || 15000;

    console.log(`[DATABASE] Applying PRAGMAs: busy_timeout=${busyTimeout}, journal_mode=${journalMode}, synchronous=${synchronous}`);
    
    // SQLite3 Raw database object is in connection
    // We use .serialize to ensure these commands run in order
    await new Promise((resolve, reject) => {
        connection.serialize(() => {
            connection.run(`PRAGMA busy_timeout = ${busyTimeout}`, (err) => { 
                if (err) console.error("Error setting busy_timeout", err); 
            });
            connection.run(`PRAGMA journal_mode = ${journalMode}`, (err) => { 
                if (err) console.error("Error setting journal_mode", err); 
            });
            connection.run(`PRAGMA synchronous = ${synchronous}`, (err) => {
                if (err) {
                    console.error("Error setting synchronous", err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
    console.log('[DATABASE] PRAGMAs finalized.');
});

module.exports = sequelize;
