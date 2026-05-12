const fs = require('fs');
const path = require('path');

const db1 = 'c:\\Users\\felix\\Documents\\PMD Projects\\LMS 2.0\\backend\\data.db';
const db2 = 'c:\\Users\\felix\\Documents\\PMD Projects\\LMS 2.0\\directus\\database\\data.db';

console.log('DB1 size:', fs.existsSync(db1) ? fs.statSync(db1).size : 'missing');
console.log('DB2 size:', fs.existsSync(db2) ? fs.statSync(db2).size : 'missing');
