require('dotenv').config();
const sequelize = require('./src/config/db');

async function checkPragmas() {
    try {
        const [journalMode] = await sequelize.query('PRAGMA journal_mode;');
        const [busyTimeout] = await sequelize.query('PRAGMA busy_timeout;');
        const [synchronous] = await sequelize.query('PRAGMA synchronous;');
        
        console.log('--- Pragmas Raw ---');
        console.log('journal_mode:', journalMode);
        console.log('busy_timeout:', busyTimeout);
        console.log('synchronous:', synchronous);
        console.log('---------------');
    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        process.exit();
    }
}

checkPragmas();
