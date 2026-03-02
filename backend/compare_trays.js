const sequelize = require('./src/config/db');

async function compareTables() {
    try {
        const [trays] = await sequelize.query("SELECT COUNT(*) as count FROM trays");
        const [ref_trays] = await sequelize.query("SELECT COUNT(*) as count FROM ref_trays");

        console.log('trays count:', trays[0].count);
        console.log('ref_trays count:', ref_trays[0].count);

        const [refFields] = await sequelize.query("PRAGMA table_info(ref_trays)");
        console.log('\nref_trays columns:');
        refFields.forEach(f => console.log(f.name, f.type));

        const [traysFields] = await sequelize.query("PRAGMA table_info(trays)");
        console.log('\ntrays columns:');
        traysFields.forEach(f => console.log(f.name, f.type));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

compareTables();
