
const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'c:/Users/felix/Documents/PMD Projects/LMS 2.0/directus/database/data.db',
    logging: false
});

async function check() {
    try {
        console.log("Checking database schema...");
        const tables = [
            "ref_process_steps",
            "ref_letter_kinds",
            "ref_statuses",
            "ref_trays"
        ];

        for (const table of tables) {
            const [results] = await sequelize.query(`PRAGMA table_info(${table})`);
            console.log(`${table} Columns:`, results.map(r => r.name).join(', '));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

check();
