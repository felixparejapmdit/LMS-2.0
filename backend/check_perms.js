const { RolePermission } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function checkPermissions() {
    try {
        await sequelize.authenticate();
        const perms = await RolePermission.findAll({
            where: {
                page_name: ['vip-view', 'guest-send-letter']
            }
        });
        console.log('Permissions for VIP View and GuestSendLetter:');
        perms.forEach(p => {
            console.log(`- Role: ${p.role_id}, Page: ${p.page_name}, View: ${p.can_view}`);
        });
        process.exit(0);
    } catch (error) {
        console.error('Failed:', error);
        process.exit(1);
    }
}

checkPermissions();
