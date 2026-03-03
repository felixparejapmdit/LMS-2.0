const { User } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function fixUsers() {
    try {
        await sequelize.authenticate();
        // Set all users to active status and reset Admin access if they were set to User but need it.
        // Actually, just set all null statuses to 'active'
        const [updatedRows] = await User.update(
            { status: 'active' },
            { where: { status: null } }
        );
        console.log(`Updated ${updatedRows} users to status: 'active'.`);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

fixUsers();
