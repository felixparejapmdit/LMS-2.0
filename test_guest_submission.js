const axios = require('axios');

async function testSubmission() {
    const backendUrl = 'http://localhost:5000/api';
    const payload = {
        sender: "DOE, JANE",
        encoder: "SMITH, JOHN",
        summary: "Test letter summary",
        date_received: new Date().toISOString(),
        global_status: 1,
        // encoder_id omitted as per guest mode
        letter_type: 'Non-Confidential',
        attachment_id: "",
        scanned_copy: null,
        direction: 'Incoming',
        kind: null,
        assigned_dept: ""
    };

    try {
        console.log("Sending payload:", payload);
        const response = await axios.post(`${backendUrl}/letters`, payload);
        console.log("Success:", response.data);
    } catch (error) {
        console.error("Failed:", error.response ? error.response.data : error.message);
    }
}

testSubmission();
