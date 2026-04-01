const sequelize = require('./src/config/db');

async function run() {
    try {
        console.log("--- STARTING DATABASE RECONSTRUCTION ---");
        
        // 1. Get the current schema to replicate it exactly
        const [tableInfo] = await sequelize.query("PRAGMA table_info(letters);");
        const cols = tableInfo.map(c => {
            let def = `"${c.name}" ${c.type}`;
            if (c.notnull) def += " NOT NULL";
            if (c.pk) def += " PRIMARY KEY AUTOINCREMENT";
            if (c.dflt_value !== null) def += ` DEFAULT ${c.dflt_value}`;
            return def;
        }).join(", ");

        console.log("Replicating columns:", cols);

        // 2. Perform the atomic swap
        await sequelize.query("PRAGMA foreign_keys = OFF;");
        await sequelize.query("BEGIN TRANSACTION;");
        
        // Create new table without FK
        await sequelize.query(`CREATE TABLE letters_new (${cols});`);
        
        // Copy data
        await sequelize.query("INSERT INTO letters_new SELECT * FROM letters;");
        
        // Swap
        await sequelize.query("DROP TABLE letters;");
        await sequelize.query("ALTER TABLE letters_new RENAME TO letters;");
        
        await sequelize.query("COMMIT;");
        await sequelize.query("PRAGMA foreign_keys = ON;");
        
        console.log("--- SUCCESS: Database rule removed ---");
        process.exit(0);
    } catch (err) {
        console.error("FATAL RECONSTRUCTION ERROR:", err);
        process.exit(1);
    }
}
run();
