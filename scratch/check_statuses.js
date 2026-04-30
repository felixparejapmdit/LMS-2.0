const { Status } = require('./backend/src/models/associations');
async function run() {
    const statuses = await Status.findAll();
    console.log(JSON.stringify(statuses, null, 2));
    process.exit(0);
}
run();
