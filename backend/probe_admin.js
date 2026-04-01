const { User } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function run() {
    try {
        const user = await User.findOne({ where: { username: 'admin' } });
        console.log("ADMIN USER:", JSON.stringify(user, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
