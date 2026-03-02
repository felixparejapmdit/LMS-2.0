const sequelize = require('./src/config/db');

async function fixTrayOnly() {
    try {
        console.log('Fixing ref_trays specifically...');

        // 1. Drop existing incomplete table if it exists
        await sequelize.query('DROP TABLE IF EXISTS ref_trays');

        // 2. Create the correct table
        await sequelize.query(`
            CREATE TABLE ref_trays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tray_no TEXT NOT NULL,
                description TEXT,
                capacity INTEGER DEFAULT 100,
                dept_id INTEGER,
                UNIQUE(tray_no, dept_id)
            )
        `);
        console.log('Recreated ref_trays with correct columns.');

        // 3. Insert default data since it was lost in last run
        await sequelize.query(`
            INSERT INTO ref_trays (tray_no, description, capacity, dept_id) 
            VALUES ('Tray 1', 'Incoming Processing', 100, NULL)
        `);
        console.log('Inserted default Tray 1.');

        console.log('Tray fix completed!');
    } catch (error) {
        console.error('Tray fix failed:', error);
    } finally {
        await sequelize.close();
    }
}

fixTrayOnly();
