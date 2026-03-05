// Debug missing permissions
const axios = require('axios');

async function debugSave() {
    try {
        const payload = {
            role_id: "ac74f61c-344d-4648-9bcf-0ed4d2330b37",
            permissions: [
                {
                    page_name: "vip-view",
                    can_view: true,
                    can_create: true,
                    can_edit: true,
                    can_delete: true,
                    can_special: true
                },
                {
                    page_name: "guest-send-letter",
                    can_view: true,
                    can_create: true,
                    can_edit: true,
                    can_delete: true,
                    can_special: true
                }
            ]
        };
        const res = await axios.post('http://localhost:5000/api/role-permissions/bulk-update', payload);
        console.log("Response:", res.data);
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}
debugSave();
