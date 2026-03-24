const { Letter, LetterAssignment } = require('./backend/src/models/associations');
async function checkCounts() {
    try {
        const lettersCount = await Letter.count();
        const assignmentsCount = await LetterAssignment.count();
        console.log(`Total Letters: ${lettersCount}`);
        console.log(`Total Assignments: ${assignmentsCount}`);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
checkCounts();
