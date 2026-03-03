const { User } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function fixUserColumns() {
    try {
        await sequelize.authenticate();

        // Ensure critical Directus fields are set for login accounts
        const [updated] = await User.update(
            {
                status: 'active',
                // provider: 'default' // Usually required if set to null
            },
            {
                where: {
                    username: ['admin', 'atg', 'felixpareja07']
                }
            }
        );

        // Raw query to set provider since it might not be in the model but is in the table
        try {
            await sequelize.query("UPDATE directus_users SET provider = 'default' WHERE provider IS NULL");
            console.log("Updated 'provider' to 'default' for all users.");
        } catch (e) {
            console.log("Note: provider column might not exist or is already handled.");
        }

        console.log(`Successfully verified ${updated} user(s) for Directus compatibility.`);
    } catch (e) {
        console.error("Error fixing user columns:", e.message);
    } finally {
        process.exit();
    }
}

fixUserColumns();
