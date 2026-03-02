const sequelize = require('./src/config/db');

async function syncDirectus() {
    try {
        console.log('Syncing Directus metadata...');

        // --- 1. Cleanup old field ---
        await sequelize.query("DELETE FROM directus_fields WHERE collection = 'letters' AND field = 'endorsed'");
        console.log('Removed endorsed from letters in metadata');

        // --- 2. Add status_id to letter_assignments ---
        const [existingStatusId] = await sequelize.query("SELECT * FROM directus_fields WHERE collection = 'letter_assignments' AND field = 'status_id'");
        if (existingStatusId.length === 0) {
            await sequelize.query(`INSERT INTO directus_fields 
                (collection, field, interface, display, readonly, hidden, width) 
                VALUES ('letter_assignments', 'status_id', 'select-dropdown-m2o', 'related-values', 0, 0, 'half')`);
            console.log('Added status_id to letter_assignments in metadata');
        }

        // --- 3. Add endorsed to letter_assignments ---
        const [existingEndorsed] = await sequelize.query("SELECT * FROM directus_fields WHERE collection = 'letter_assignments' AND field = 'endorsed'");
        if (existingEndorsed.length === 0) {
            await sequelize.query(`INSERT INTO directus_fields 
                (collection, field, interface, options, display, readonly, hidden, width) 
                VALUES ('letter_assignments', 'endorsed', 'select-dropdown', '{"choices":[{"text":"Yes","value":"Yes"},{"text":"No","value":"No"},{"text":"Pending","value":"Pending"}]}', 'labels', 0, 0, 'half')`);
            console.log('Added endorsed to letter_assignments in metadata');
        }

        // --- 4. Relate status_id to ref_statuses ---
        const [existingRel] = await sequelize.query("SELECT * FROM directus_relations WHERE many_collection = 'letter_assignments' AND many_field = 'status_id'");
        if (existingRel.length === 0) {
            await sequelize.query(`INSERT INTO directus_relations 
                (many_collection, many_field, one_collection) 
                VALUES ('letter_assignments', 'status_id', 'ref_statuses')`);
            console.log('Added relationship for status_id in metadata');
        }

        console.log('Directus metadata sync complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error syncing metadata:', error);
        process.exit(1);
    }
}

syncDirectus();
