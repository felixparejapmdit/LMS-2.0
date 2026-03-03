const { User, Role } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function restoreAdmin() {
    try {
        await sequelize.authenticate();

        // Find the actual ID for the 'Administrator' role
        const adminRole = await Role.findOne({ where: { name: 'Administrator' } });
        if (!adminRole) {
            console.error("Administrator role not found in DB.");
            return;
        }

        // Force 'admin' and 'felixpareja07' to be Administrators
        const [updated] = await User.update(
            { role: adminRole.id, status: 'active' },
            { where: { username: ['admin', 'felixpareja07'] } }
        );

        console.log(`Successfully restored Admin access to ${updated} user(s).`);
        console.log(`Role ID applied: ${adminRole.id}`);
    } catch (e) {
        console.error("Error restoring local admin:", e.message);
    } finally {
        process.exit();
    }
}

restoreAdmin();
