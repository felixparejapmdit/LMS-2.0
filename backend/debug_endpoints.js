const axios = require('axios');

async function testEndpoints() {
    const endpoints = [
        'http://localhost:5000/api/letters',
        'http://localhost:5000/api/letter-assignments?department_id=3',
        'http://localhost:5000/api/stats/dashboard?department_id=3'
    ];

    for (const url of endpoints) {
        try {
            console.log(`Testing ${url}...`);
            const response = await axios.get(url);
            console.log(`Success: ${response.status}`);
        } catch (error) {
            console.error(`Status ${error.response?.status}: ${JSON.stringify(error.response?.data)}`);
        }
    }
}

testEndpoints();
