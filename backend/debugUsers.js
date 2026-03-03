const { User } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function debug() {
    try {
        await sequelize.authenticate();
        const users = await User.findAll({ limit: 5 });
        console.log(JSON.stringify(users, null, 2));
    } finally {
        process.exit();
    }
}
debug();
