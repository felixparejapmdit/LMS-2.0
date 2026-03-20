const sequelize = require('./backend/src/config/db');
(async () => {
    try {
        const [res] = await sequelize.query("SELECT field, collection FROM directus_fields WHERE collection IN ('letters', 'letter_assignments')");
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
