const { ProcessStep } = require('./src/models/associations');

async function listSteps() {
    try {
        const steps = await ProcessStep.findAll();
        console.log('Process Steps:');
        steps.forEach(s => {
            console.log(`- ID: ${s.id}, Name: "${s.step_name}"`);
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

listSteps();
