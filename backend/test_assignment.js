const { LetterAssignment, Letter, Status, Tray, LetterKind } = require('./src/models/associations');
const { Op } = require('sequelize');

async function test() {
    try {
        const vip = 'true';
        const where = { step_id: 1, status: 'Pending' };

        const letterInclude = {
            model: Letter,
            as: 'letter',
            include: [
                { model: Status, as: 'status', attributes: ['status_name'] },
                { model: Tray, as: 'tray' },
                { model: require('./src/models/LetterKind'), as: 'letterKind' } // LetterKind?
            ]
        };

        if (vip === 'true') {
            letterInclude.where = {
                tray_id: null,
                [Op.or]: [
                    { global_status: 2 },
                    { '$letter.status.status_name$': 'ATG Note' }
                ]
            };
            letterInclude.required = true;
        }

        const assignments = await LetterAssignment.findAll({
            where,
            include: [letterInclude],
            subQuery: false
        });
        console.log('Success - Number of assignments:', assignments.length);
    } catch (error) {
        console.error('Error details:', error);
    } finally {
        process.exit();
    }
}

test();
