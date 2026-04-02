const { LetterAssignment } = require('./backend/src/models/associations');
const sequelize = require('./backend/src/config/db');

async function check() {
    try {
        const columns = await sequelize.getQueryInterface().describeTable('letter_assignments');
        console.log('Columns:', Object.keys(columns));
        
        const sample = await LetterAssignment.findOne();
        console.log('Sample Assignment:', sample ? sample.toJSON() : 'None');
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
