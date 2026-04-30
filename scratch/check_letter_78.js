const { Letter, Status } = require('./backend/src/models/associations');
async function run() {
    const letter = await Letter.findByPk(78, {
        include: [{ model: Status, as: 'status' }]
    });
    console.log(JSON.stringify(letter, null, 2));
    process.exit(0);
}
run();
