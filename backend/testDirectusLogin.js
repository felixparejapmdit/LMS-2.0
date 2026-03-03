const axios = require('axios');

async function testDirectusLogin() {
    const payloads = [
        { email: 'roland.amaro@gmail.com', password: 'katapatan', label: 'Roland (Known Working)' },
        { email: 'atg@lms.local', password: 'f@1th', label: 'ATG (Failing)' }
    ];

    for (const p of payloads) {
        console.log(`--- Testing ${p.label} ---`);
        try {
            const res = await axios.post('http://localhost:8055/auth/login', {
                email: p.email,
                password: p.password
            });
            console.log(`✅ Success for ${p.label}!`);
            console.log(`Status: ${res.status}`);
        } catch (err) {
            console.error(`❌ FAILED for ${p.label}`);
            console.error(`Status: ${err.response?.status}`);
            console.error(`Data:`, JSON.stringify(err.response?.data, null, 2));
        }
    }
}

testDirectusLogin();
