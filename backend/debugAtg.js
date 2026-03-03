const { User } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function debug() {
    try {
        await sequelize.authenticate();
        const user = await User.findOne({ where: { username: 'atg' } });
        console.log("ATG USER DATA:");
        console.log(JSON.stringify(user, null, 2));
    } finally {
        process.exit();
    }
}
debug();
