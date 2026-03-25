const mysql = require('mysql2/promise');

const legacyDbConfig = {
    host: '172.18.162.84',
    user: 'admin',
    password: 'katapat@n',
    database: 'lms',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000, // 10s
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

const pool = mysql.createPool(legacyDbConfig);

module.exports = pool;
