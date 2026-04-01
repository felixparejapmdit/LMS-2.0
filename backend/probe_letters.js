const { Letter } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function run() {
    try {
        const letters = await Letter.findAll({
            order: [['created_at', 'DESC']],
            limit: 5
        });
        console.log("LAST LETTERS:", JSON.stringify(letters, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
