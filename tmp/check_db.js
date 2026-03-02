
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
        const [results] = await sequelize.query("PRAGMA table_info(ref_process_steps)");
        console.log("Process Steps Columns:", results.map(r => r.name).join(', '));

        const [results2] = await sequelize.query("PRAGMA table_info(ref_letter_kinds)");
        console.log("Letter Kinds Columns:", results2.map(r => r.name).join(', '));

        const [results3] = await sequelize.query("PRAGMA table_info(ref_statuses)");
        console.log("Statuses Columns:", results3.map(r => r.name).join(', '));

        const [results4] = await sequelize.query("PRAGMA table_info(ref_trays)");
        console.log("Trays Columns:", results4.map(r => r.name).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

check();
