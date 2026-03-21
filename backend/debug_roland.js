const { User, Role } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function run() {
    try {
        const user = await User.findOne({
            where: { username: 'roland.amaro' },
            include: [{ model: Role, as: 'roleData' }]
        });
        
        if (!user) {
            console.log('User roland.amaro NOT FOUND');
        } else {
            console.log('User Found:', {
                id: user.id,
                username: user.username,
                roleId: user.role,
                roleName: user.roleData?.name,
                interdepartment: user.interdepartment
            });
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

run();
