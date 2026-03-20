const sequelize = require('./backend/src/config/db');

async function restoreMetadata() {
    try {
        const collectionsToSync = [
            'letters', 
            'letter_assignments', 
            'letter_logs', 
            'comments', 
            'ref_attachments', 
            'ref_departments', 
            'ref_letter_kinds', 
            'ref_process_steps', 
            'ref_statuses', 
            'ref_trays', 
            'person'
        ];

        for (const collection of collectionsToSync) {
            console.log(`Checking collection: ${collection}`);
            
            // Get database columns
            const [columns] = await sequelize.query(`PRAGMA table_info(${collection})`);
            
            for (const col of columns) {
                const fieldName = col.name;
                
                // Check if already in directus_fields
                const [existing] = await sequelize.query(`SELECT id FROM directus_fields WHERE collection = ? AND field = ?`, {
                    replacements: [collection, fieldName]
                });
                
                if (existing.length === 0) {
                    console.log(`  Adding missing field mapping: ${fieldName} for ${collection}`);
                    
                    // Simple insert with defaults
                    // status field in directus_fields is often used for something special, but here we just want the column visible.
                    await sequelize.query(`
                        INSERT INTO directus_fields (collection, field, interface, readonly, hidden, sort, width, searchable)
                        VALUES (?, ?, ?, 0, 0, NULL, 'full', 1)
                    `, {
                        replacements: [collection, fieldName, 'input']
                    });
                }
            }
        }
        
        // Also ensure collections are actually in directus_collections
        for (const collection of collectionsToSync) {
             const [existingColl] = await sequelize.query(`SELECT collection FROM directus_collections WHERE collection = ?`, {
                replacements: [collection]
            });
            if (existingColl.length === 0) {
                 console.log(`Adding missing collection mapping: ${collection}`);
                 await sequelize.query(`INSERT INTO directus_collections (collection, icon, display_template, hidden, singleton) VALUES (?, 'folder', '{{id}}', 0, 0)`, {
                    replacements: [collection]
                 });
            }
        }

        console.log("Metadata restoration complete. Please restart or clear Directus cache.");
    } catch (e) {
        console.error("Restoration failed:", e);
    }
}

restoreMetadata();
