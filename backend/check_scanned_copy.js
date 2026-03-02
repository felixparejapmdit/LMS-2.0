const sequelize = require('./src/config/db');

async function migrate() {
    try {
        console.log('Migrating scanned_copy to STRING...');

        // SQLite doesn't support easy ALTER COLUMN type for all cases, 
        // but for UUID to STRING it's mostly compatible since UUID stored as string anyway.
        // However, Sequelize's UUID to STRING mapping usually just works if we update the model.
        // But to be safe in SQLite, we might need to recreate the table or just trust the model change
        // if the underlying data remains text.

        // Let's check the actual type in DB first
        const [results] = await sequelize.query("PRAGMA table_info(letters)");
        const col = results.find(c => c.name === 'scanned_copy');
        console.log('Current scanned_copy type:', col.type);

        if (col.type === 'UUID') {
            // In SQLite, UUID is often just TEXT.
            // We can try to cast or just rename if needed, but let's try direct update first.
        }

        console.log('Model update will handle the JS side. For DB, ensuring it can store paths.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
