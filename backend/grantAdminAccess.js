
const { Role, RolePermission } = require('./src/models/associations');
const sequelize = require('./src/config/db');

const PAGES = [
    "home", "inbox", "outbox", "new-letter", "master-table",
    "letters-with-comments", "letter-tracker", "upload-pdf", "spam",
    "endorsements", "settings", "trays", "users", "contacts",
    "departments", "kinds", "steps", "statuses", "attachments", "role-matrix", "data-import"
];

async function grantFullAccess() {
    try {
        console.log("Starting full access grant...");

        // Find admin roles
        const roles = await Role.findAll();
        const adminRoles = roles.filter(r => {
            const name = r.name.toUpperCase();
            return name === 'ADMIN' || name === 'SUPERADMIN' || name === 'ADMINISTRATOR' || name === 'SUPER ADMIN';
        });

        console.log(`Found ${adminRoles.length} admin roles to update.`);

        for (const role of adminRoles) {
            console.log(`Processing role: ${role.name} (${role.id})`);

            for (const page of PAGES) {
                await RolePermission.upsert({
                    role_id: role.id,
                    page_name: page,
                    can_view: true,
                    can_create: true,
                    can_edit: true,
                    can_delete: true,
                    can_special: true
                });
            }
            console.log(`- Granted all permissions for ${role.name}`);
        }

        console.log("Success: All admin/superadmin roles now have full access.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

grantFullAccess();
