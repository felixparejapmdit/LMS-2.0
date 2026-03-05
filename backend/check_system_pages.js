const { SystemPage } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function checkPages() {
    try {
        await sequelize.authenticate();
        const pages = await SystemPage.findAll();
        console.log('Current System Pages:');
        pages.forEach(p => {
            console.log(`- ${p.page_id}: ${p.page_name}`);
        });
        process.exit(0);
    } catch (error) {
        console.error('Failed:', error);
        process.exit(1);
    }
}

checkPages();
