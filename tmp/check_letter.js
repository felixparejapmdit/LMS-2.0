const { Letter, Status } = require('../backend/src/models/associations');
const { Op } = require('sequelize');

async function check() {
    try {
        const letters = await Letter.findAll({
            where: { sender: { [Op.like]: '%PAREJA%' } },
            include: [{ model: Status, as: 'status' }],
            limit: 10
        });
        console.log('Letters:', letters.map(l => ({ 
            id: l.id, 
            lms_id: l.lms_id, 
            status_id: l.global_status, 
            status_name: l.status?.status_name,
            sender: l.sender 
        })));
        process.exit(0);
    } catch (err) {
        console.log(err.message);
        process.exit(1);
    }
}
check();
