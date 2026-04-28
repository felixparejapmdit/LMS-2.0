const sequelize = require('./backend/src/config/db');
async function check() {
  const [results] = await sequelize.query("PRAGMA table_info(letters)");
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}
check();
