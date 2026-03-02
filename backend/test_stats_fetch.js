const axios = require('axios');
async function test() {
    try {
        const res = await fetch('http://localhost:5000/api/stats/dashboard?department_id=3');
        const data = await res.json();
        console.log("Recent Tasks Count:", data.recentTasks.length);
        console.log("Recent Tasks snippet:");
        data.recentTasks.forEach(task => {
            console.log(`- ID: ${task.id}, Step: ${task.step?.step_name}, Status: ${task.letter?.status?.status_name}`);
        });
    } catch (e) {
        console.error(e);
    }
}
test();
