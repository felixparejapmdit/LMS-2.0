const { Role, SystemPage, RolePermission } = require('./src/models/associations');
const sequelize = require('./src/config/db');

async function check() {
    try {
        const roles = await Role.findAll({ 
            include: [{ model: User, as: 'users' }],
        });
        console.log('--- ROLES ---');
        const data = roles.map(r => ({
            id: r.id,
            name: r.name,
            dept_id: r.dept_id,
            user_count: r.users?.length || 0
        }));
        console.table(data);

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

check();
