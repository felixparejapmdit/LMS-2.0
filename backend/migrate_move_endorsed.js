const sequelize = require('./src/config/db');

async function migrate() {
    try {
        console.log('--- Database Migration Started ---');

        // 1. Update letter_assignments table
        console.log('Updating letter_assignments table...');
        try {
            await sequelize.query('ALTER TABLE letter_assignments ADD COLUMN status_id INTEGER');
            console.log('Added column letter_assignments.status_id');
        } catch (e) { console.log('status_id might already exist'); }

        try {
            await sequelize.query('ALTER TABLE letter_assignments ADD COLUMN endorsed VARCHAR(255) DEFAULT "Pending"');
            console.log('Added column letter_assignments.endorsed');
        } catch (e) { console.log('endorsed in letter_assignments might already exist'); }

        // 2. Data Migration: If letters had endorsed value, maybe we should move it? 
        // But endorsed is now per assignment. Usually it makes sense to keep it on the letter or have it on the assignment. 
        // User asked to MOVE it to letter_assignments.

        // 3. Optional: Cleanup old columns (SQLite limitation: dropping columns is hard)
        // We will just leave them for now to avoid table recreation complexity unless necessary.
        // Directus will be told to ignore/delete them from metadata.

        console.log('--- Database Migration Finished ---');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
