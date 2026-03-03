const { User } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function compare() {
    try {
        await sequelize.authenticate();
        const users = await User.findAll({
            where: {
                username: ['atg', 'roland.amaro']
            }
        });
        console.log("USER COMPARISON:");
        console.log(JSON.stringify(users, null, 2));
    } finally {
        process.exit();
    }
}
compare();
