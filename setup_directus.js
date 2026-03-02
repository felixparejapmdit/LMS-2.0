
const API_URL = 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password';

async function setup() {
    let token = '';
    try {
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD
            })
        });
        const loginData = await loginResponse.json();
        if (!loginResponse.ok) throw new Error(JSON.stringify(loginData));
        token = loginData.data.access_token;
        console.log('Logged in successfully');
    } catch (error) {
        console.error('Login failed:', error.message);
        return;
    }

    async function api(path, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        if (body) options.body = JSON.stringify(body);
        const res = await fetch(`${API_URL}${path}`, options);
        const data = await res.json();
        return { ok: res.ok, data, status: res.status };
    }

    async function createCollection(collection, schema = {}, meta = {}) {
        const res = await api('/collections', 'POST', { collection, schema, meta });
        if (res.ok) {
            console.log(`Created collection: ${collection}`);
        } else {
            if (res.data?.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE' || res.data?.errors?.[0]?.message?.includes('already exists')) {
                console.log(`Collection ${collection} already exists`);
            } else {
                console.error(`Failed to create collection ${collection}:`, JSON.stringify(res.data));
            }
        }
    }

    async function createField(collection, field, type, schema = {}, meta = {}) {
        const res = await api(`/fields/${collection}`, 'POST', { field, type, schema, meta });
        if (res.ok) {
            console.log(`Created field ${field} in ${collection}`);
        } else {
            if (res.data?.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE' || res.data?.errors?.[0]?.message?.includes('already exists')) {
                console.log(`Field ${field} in ${collection} already exists`);
            } else {
                console.error(`Failed to create field ${field} in ${collection}:`, JSON.stringify(res.data));
            }
        }
    }

    async function createRelation(collection, field, related_collection, meta = {}) {
        const res = await api('/relations', 'POST', {
            collection,
            field,
            related_collection,
            meta
        });
        if (res.ok) {
            console.log(`Created relationship for ${collection}.${field}`);
        } else {
            console.log(`Relationship for ${collection}.${field} possibly exists or failed:`, res.status);
        }
    }

    // 1. Reference Collections
    await createCollection('ref_letter_kinds');
    await createField('ref_letter_kinds', 'kind_name', 'string', {}, { interface: 'input' });
    await createField('ref_letter_kinds', 'description', 'text', {}, { interface: 'textarea' });

    await createCollection('ref_statuses');
    await createField('ref_statuses', 'status_name', 'string', {}, { interface: 'input' });

    await createCollection('ref_departments');
    await createField('ref_departments', 'dept_name', 'string', {}, { interface: 'input' });
    await createField('ref_departments', 'dept_code', 'string', { unique: true }, { interface: 'input' });

    await createCollection('ref_process_steps');
    await createField('ref_process_steps', 'step_name', 'string', {}, { interface: 'input' });
    await createField('ref_process_steps', 'description', 'text', {}, { interface: 'textarea' });

    // 2. Custom field in directus_users
    await createField('directus_users', 'dept_id', 'integer', {}, {
        interface: 'select-dropdown-m2o',
        options: { template: '{{dept_name}}' }
    });
    await createRelation('directus_users', 'dept_id', 'ref_departments');

    // 3. letters
    await createCollection('letters');
    await createField('letters', 'atg_id', 'string', { unique: true }, { interface: 'input' });
    await createField('letters', 'date_received', 'date', {}, { interface: 'datetime' });
    await createField('letters', 'sender', 'string', {}, { interface: 'input' });
    await createField('letters', 'summary', 'text', {}, { interface: 'input-rich-text-html' });
    await createField('letters', 'kind', 'integer', {}, { interface: 'select-dropdown-m2o' });
    await createField('letters', 'global_status', 'integer', {}, { interface: 'select-dropdown-m2o' });
    await createField('letters', 'encoder_id', 'uuid', {}, { interface: 'select-dropdown-m2o' });
    await createField('letters', 'endorsed', 'string', {}, {
        interface: 'select-dropdown',
        options: {
            choices: [
                { text: 'Yes', value: 'Yes' },
                { text: 'No', value: 'No' },
                { text: 'Pending', value: 'Pending' }
            ]
        }
    });
    await createField('letters', 'direction', 'string', { default_value: 'Incoming' }, {
        interface: 'select-dropdown',
        options: {
            choices: [
                { text: 'Incoming', value: 'Incoming' },
                { text: 'Outgoing', value: 'Outgoing' }
            ]
        }
    });
    await createField('letters', 'scanned_copy', 'uuid', {}, { interface: 'file' });

    await createRelation('letters', 'kind', 'ref_letter_kinds');
    await createRelation('letters', 'global_status', 'ref_statuses');
    await createRelation('letters', 'encoder_id', 'directus_users');
    await createRelation('letters', 'scanned_copy', 'directus_files');

    // 4. letter_assignments
    await createCollection('letter_assignments');
    await createField('letter_assignments', 'letter', 'uuid', {}, { interface: 'select-dropdown-m2o' });
    await createField('letter_assignments', 'department', 'integer', {}, { interface: 'select-dropdown-m2o' });
    await createField('letter_assignments', 'step', 'integer', {}, { interface: 'select-dropdown-m2o' });
    await createField('letter_assignments', 'assigned_by', 'uuid', {}, { interface: 'select-dropdown-m2o' });
    await createField('letter_assignments', 'status', 'string', {}, {
        interface: 'select-dropdown',
        options: {
            choices: [
                { text: 'Pending', value: 'Pending' },
                { text: 'In Progress', value: 'In Progress' },
                { text: 'Done', value: 'Done' },
                { text: 'Returned', value: 'Returned' }
            ]
        }
    });
    await createField('letter_assignments', 'due_date', 'timestamp', {}, { interface: 'datetime' });
    await createField('letter_assignments', 'remarks', 'text', {}, { interface: 'textarea' });
    await createField('letter_assignments', 'completed_at', 'timestamp', {}, { interface: 'datetime' });
    await createField('letter_assignments', 'created_at', 'timestamp', { default_value: 'NOW()' }, { interface: 'datetime' }); // Directus handles NOW()

    await createRelation('letter_assignments', 'letter', 'letters');
    await createRelation('letter_assignments', 'department', 'ref_departments');
    await createRelation('letter_assignments', 'step', 'ref_process_steps');
    await createRelation('letter_assignments', 'assigned_by', 'directus_users');

    // 5. letter_logs
    await createCollection('letter_logs');
    await createField('letter_logs', 'letter', 'uuid', {}, { interface: 'select-dropdown-m2o' });
    await createField('letter_logs', 'user', 'uuid', {}, { interface: 'select-dropdown-m2o' });
    await createField('letter_logs', 'action_taken', 'string', {}, { interface: 'input' });
    await createField('letter_logs', 'log_date', 'timestamp', { default_value: 'NOW()' }, { interface: 'datetime' });
    await createField('letter_logs', 'metadata', 'json', {}, { interface: 'input-code' });

    await createRelation('letter_logs', 'letter', 'letters');
    await createRelation('letter_logs', 'user', 'directus_users');

    // 6. Utility Collections
    await createCollection('comments');
    await createField('comments', 'letter', 'uuid', {}, { interface: 'select-dropdown-m2o' });
    await createField('comments', 'user', 'uuid', {}, { interface: 'select-dropdown-m2o' });
    await createField('comments', 'comment_body', 'text', {}, { interface: 'textarea' });
    await createField('comments', 'created_at', 'timestamp', { default_value: 'NOW()' }, { interface: 'datetime' });

    await createRelation('comments', 'letter', 'letters');
    await createRelation('comments', 'user', 'directus_users');

    await createCollection('trays');
    await createField('trays', 'letter', 'uuid', { unique: true }, { interface: 'select-dropdown-m2o' });
    await createField('trays', 'tray_no', 'string', {}, { interface: 'input' });
    await createRelation('trays', 'letter', 'letters', { one_field: 'tray_info' });

    await createCollection('link_letters');
    await createField('link_letters', 'main_letter', 'uuid', {}, { interface: 'select-dropdown-m2o' });
    await createField('link_letters', 'attached_letter', 'uuid', {}, { interface: 'select-dropdown-m2o' });
    await createField('link_letters', 'relation_type', 'string', {}, {
        interface: 'select-dropdown',
        options: {
            choices: [
                { text: 'Attachment', value: 'Attachment' },
                { text: 'Reference', value: 'Reference' },
                { text: 'Response', value: 'Response' }
            ]
        }
    });

    await createRelation('link_letters', 'main_letter', 'letters');
    await createRelation('link_letters', 'attached_letter', 'letters');

    async function seed(collection, items) {
        for (const item of items) {
            const res = await api(`/items/${collection}`, 'POST', item);
            if (res.ok) {
                console.log(`Seeded ${collection}: ${JSON.stringify(item)}`);
            } else {
                console.log(`${collection} item possibly exists or failed:`, res.status);
            }
        }
    }

    await seed('ref_letter_kinds', [
        { kind_name: 'Memorandum', description: 'Internal official memo' },
        { kind_name: 'Invitation', description: 'Event or meeting invitation' },
        { kind_name: 'Billing', description: 'Invoice or billing statement' },
        { kind_name: 'Regular', description: 'Regular correspondence' }
    ]);

    await seed('ref_statuses', [
        { status_name: 'Received' },
        { status_name: 'Processing' },
        { status_name: 'Archived' },
        { status_name: 'Cancelled' }
    ]);

    await seed('ref_departments', [
        { dept_name: 'Information Technology', dept_code: 'IT' },
        { dept_name: 'Legal', dept_code: 'LEGAL' },
        { dept_name: 'Finance', dept_code: 'FIN' }
    ]);

    await seed('ref_process_steps', [
        { step_name: 'For Review', description: 'Initial review step' },
        { step_name: 'For Signature', description: 'Awaiting formal signature' },
        { step_name: 'For Filing', description: 'Final step for physical storage' }
    ]);

    console.log('Done setting up collections and seeding data');
}

setup();
