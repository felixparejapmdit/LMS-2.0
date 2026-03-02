
const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'c:/Users/felix/Documents/PMD Projects/LMS 2.0/directus/database/data.db',
    logging: false
});

async function fix() {
    try {
        console.log("Repairing database schema...");
        const columnsToAdd = [
            { table: "ref_process_steps", column: "dept_id", type: "INTEGER" },
            { table: "ref_letter_kinds", column: "dept_id", type: "INTEGER" },
            { table: "ref_statuses", column: "dept_id", type: "INTEGER" },
            { table: "ref_trays", column: "dept_id", type: "INTEGER" }
        ];

        for (const item of columnsToAdd) {
            try {
                // Check if column exists first
                const [info] = await sequelize.query(`PRAGMA table_info(${item.table})`);
                const exists = info.some(c => c.name === item.column);
                if (!exists) {
                    console.log(`Adding ${item.column} to ${item.table}...`);
                    await sequelize.query(`ALTER TABLE ${item.table} ADD COLUMN ${item.column} ${item.type}`);
                    console.log(`Successfully added ${item.column} to ${item.table}.`);
                } else {
                    console.log(`${item.column} already exists in ${item.table}.`);
                }
            } catch (err) {
                console.error(`Failed to update ${item.table}:`, err.message);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

fix();
