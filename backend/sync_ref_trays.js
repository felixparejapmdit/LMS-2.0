const sequelize = require('./src/config/db');

async function syncTrays() {
    try {
        console.log('Unlinking old "trays" collection from Directus metadata...');
        await sequelize.query("DELETE FROM directus_collections WHERE collection='trays'");

        console.log('Linking "ref_trays" collection to Directus metadata...');
        // Insert record into directus_collections
        await sequelize.query(`
            INSERT OR IGNORE INTO directus_collections (
                collection, 
                icon, 
                archive_app_filter, 
                accountability, 
                collapse, 
                hidden, 
                singleton, 
                versioning
            ) VALUES (
                'ref_trays',
                'inbox',
                1,
                'all',
                'open',
                0,
                0,
                0
            )
        `);

        // Check if there are any fields in directus_fields for trays - usually none on first import
        // But we should ensure 'id' is mapped correctly if it's not auto-magically done.

        console.log('Success! Collection "ref_trays" should now be visible in Directus.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

syncTrays();
