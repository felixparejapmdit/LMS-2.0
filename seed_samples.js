
const API_URL = 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password';

async function seedSampleData() {
    let token = '';
    try {
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        const loginData = await loginResponse.json();
        token = loginData.data.access_token;
        console.log('Logged in for seeding');
    } catch (e) {
        console.error('Login failed:', e.message);
        return;
    }

    async function api(path, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);
        const res = await fetch(`${API_URL}${path}`, options);
        return await res.json();
    }

    // 1. Get references
    const kinds = (await api('/items/ref_letter_kinds')).data;
    const statuses = (await api('/items/ref_statuses')).data;
    const depts = (await api('/items/ref_departments')).data;
    const steps = (await api('/items/ref_process_steps')).data;
    const me = (await api('/users/me')).data;

    const itDept = depts.find(d => d.dept_code === 'IT');
    const legalDept = depts.find(d => d.dept_code === 'LEGAL');
    const memoKind = kinds.find(k => k.kind_name === 'Memorandum');
    const invitationKind = kinds.find(k => k.kind_name === 'Invitation');
    const regularKind = kinds.find(k => k.kind_name === 'Regular');
    const receivedStatus = statuses.find(s => s.status_name === 'Received');
    const reviewStep = steps.find(s => s.step_name === 'For Review');

    // 2. Create Sample Letters
    const sampleLetters = [
        {
            atg_id: 'ATG-2026-001',
            date_received: '2026-02-25',
            sender: 'Central Office - HR',
            summary: '<p>Annual leave policy update for FY2026. Please distribute to all IT personnel for review and compliance.</p>',
            kind: memoKind.id,
            global_status: receivedStatus.id,
            encoder_id: me.id,
            direction: 'Incoming'
        },
        {
            atg_id: 'ATG-2026-002',
            date_received: '2026-02-26',
            sender: 'Global Tech Summit',
            summary: '<p>Official invitation for the annual technology leadership summit in Singapore. Requesting internal delegation selection.</p>',
            kind: invitationKind.id,
            global_status: receivedStatus.id,
            encoder_id: me.id,
            direction: 'Incoming'
        },
        {
            atg_id: 'ATG-OUT-2026-001',
            date_received: '2026-02-27',
            sender: 'PMD - IT Department',
            summary: '<p>Response to the central office regarding the new server infrastructure procurement request.</p>',
            kind: regularKind.id,
            global_status: receivedStatus.id,
            encoder_id: me.id,
            direction: 'Outgoing'
        },
        {
            atg_id: 'ATG-2025-999',
            date_received: '2025-12-15',
            sender: 'Finance Department',
            summary: '<p>Final budget reconciliation for the previous fiscal year. All IT assets have been accounted for.</p>',
            kind: memoKind.id,
            global_status: receivedStatus.id,
            encoder_id: me.id,
            direction: 'Incoming'
        }
    ];

    for (const letterData of sampleLetters) {
        const res = await api('/items/letters', 'POST', letterData);
        if (res.data) {
            console.log(`Created Letter: ${res.data.atg_id}`);

            const isArchive = res.data.atg_id === 'ATG-2025-999';
            const isUpcoming = res.data.atg_id === 'ATG-2026-002';

            // 3. Create Assignments
            await api('/items/letter_assignments', 'POST', {
                letter: res.data.id,
                department: itDept.id,
                step: reviewStep.id,
                assigned_by: me.id,
                status: isArchive ? 'Done' : 'Pending',
                due_date: isUpcoming ? new Date(Date.now() + 86400000 * 2).toISOString() : (isArchive ? null : '2026-03-05T17:00:00'),
                remarks: isArchive ? 'Completed audit.' : 'Kindly review the contents.',
                completed_at: isArchive ? '2025-12-20T10:00:00' : null
            });

            // 4. Create Logs
            await api('/items/letter_logs', 'POST', {
                letter: res.data.id,
                user: me.id,
                action_taken: isArchive ? 'Task completed and archived' : 'Letter assigned to IT'
            });

            // 5. Create Tray Info
            await api('/items/trays', 'POST', {
                letter: res.data.id,
                tray_no: isArchive ? 'ARCHIVE-B4-2025' : 'TRAY-A1-2026'
            });
        }
    }

    console.log('Sample data seeding complete');
}

seedSampleData();
