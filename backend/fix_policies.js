const db = require('./src/config/db.js');
const crypto = require('crypto');

async function fixPolicies() {
    try {
        const rolesToFix = ['Superuser', 'Admin', 'User', 'Encoder', 'VIP'];
        const adminPolicyId = '033fe4eb-5c8e-4b58-85fe-0a33de46434c'; // Administrator Policy

        for (const roleName of rolesToFix) {
            const [roles] = await db.query(`SELECT id FROM directus_roles WHERE name='${roleName}'`);
            if (roles.length > 0) {
                const roleId = roles[0].id;

                // Check if policy link exists
                const [accessLinks] = await db.query(`SELECT * FROM directus_access WHERE role='${roleId}'`);

                if (accessLinks.length === 0) {
                    await db.query(`INSERT INTO directus_access (id, role, policy) VALUES (?, ?, ?)`, {
                        replacements: [crypto.randomUUID(), roleId, adminPolicyId]
                    });
                    console.log(`Granted Admin policy to role: ${roleName}`);
                }
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fixPolicies();
