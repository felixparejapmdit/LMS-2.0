
const API_URL = 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password';

async function updateAdmin() {
    let token = '';
    try {
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        const loginData = await loginResponse.json();
        token = loginData.data.access_token;
    } catch (e) {
        console.error('Login failed during update prep:', e.message);
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

    // Get IT department ID
    const depts = await api('/items/ref_departments?filter[dept_code][_eq]=IT');
    const itDeptId = depts.data?.[0]?.id;

    if (itDeptId) {
        // Get current user ID
        const me = await api('/users/me');
        const myId = me.data.id;

        // Update user with department
        await api(`/users/${myId}`, 'PATCH', { dept_id: itDeptId });
        console.log('Admin user assigned to IT department');
    } else {
        console.log('IT department not found');
    }
}

updateAdmin();
