const sequelize = require('./backend/src/config/db');
(async () => {
    try {
        const [res] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log(JSON.stringify(res.map(x => x.name), null, 2));
    } catch (e) {
        console.error(e);
    }
})();
