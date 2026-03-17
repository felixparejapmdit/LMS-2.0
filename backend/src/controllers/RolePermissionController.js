const { RolePermission, Role, SystemPage, User } = require('../models/associations');
const sequelize = require('../config/db');

const PAGE_FIELD_PRESETS = {
    'home': ['refresh_button', 'quick_new_letter_button', 'quick_trays_button'],
    'vip-view': ['step_selector', 'pdf_button', 'comment_box', 'submit_button', 'edit_button', 'delete_button', 'logout_button'],
    'new-letter': ['sender_field', 'summary_field', 'status_dropdown', 'department_selector', 'attachment_selector', 'attachment_upload', 'kind_dropdown', 'tray_selector', 'save_button'],
    'inbox': ['search', 'refresh_button', 'tab_filter', 'tray_selector'],
    'outbox': ['search', 'refresh_button'],
    'spam': ['search', 'submit_button', 'clear_button', 'save_button', 'refresh_button'],
    'master-table': ['search', 'edit_button', 'delete_button', 'status_dropdown', 'department_selector', 'step_selector', 'pdf_button', 'save_button', 'attachment_upload', 'endorse_button', 'track_button', 'refresh_button'],
    'letters-with-comments': ['search', 'pdf_button', 'tab_filter', 'refresh_button'],
    'letter-tracker': ['search', 'pdf_button', 'track_button', 'refresh_button'],
    'upload-pdf': ['attachment_upload', 'save_button', 'pdf_button', 'delete_button', 'view_toggle'],
    'guest-send-letter': ['sender_field', 'encoder_field', 'summary_field', 'attachment_selector', 'attachment_upload', 'submit_button', 'clear_button'],
    'endorsements': ['search', 'print_button', 'delete_button', 'view_button', 'refresh_button'],
    'settings': ['save_button', 'layout_selector', 'font_selector'],
    'attachments': ['add_button', 'edit_button', 'delete_button', 'save_button', 'refresh_button', 'view_toggle'],
    'persons': ['add_button', 'edit_button', 'delete_button', 'save_button', 'refresh_button', 'view_toggle'],
    'data-import': ['persons_import_button', 'users_import_button'],
    'departments': ['add_button', 'edit_button', 'delete_button', 'save_button', 'refresh_button', 'view_toggle'],
    'letter-kinds': ['add_button', 'edit_button', 'delete_button', 'save_button', 'refresh_button', 'view_toggle'],
    'statuses': ['add_button', 'edit_button', 'delete_button', 'save_button', 'refresh_button', 'view_toggle'],
    'process-steps': ['add_button', 'edit_button', 'delete_button', 'save_button', 'refresh_button', 'view_toggle'],
    'trays': ['add_button', 'edit_button', 'delete_button', 'save_button', 'refresh_button', 'view_toggle', 'navigate_button'],
    'users': ['search', 'add_button', 'edit_button', 'delete_button', 'save_button', 'refresh_button', 'view_toggle', 'role_filter', 'department_filter', 'avatar_upload'],
    'role-matrix': ['search', 'save_button', 'edit_field', 'allow_all_button', 'restrict_button', 'role_selector'],
    'setup': ['department_field', 'dept_code_field', 'template_selector', 'add_button', 'delete_button', 'submit_button', 'next_button', 'back_button'],
    'letter-detail': ['pdf_button', 'back_button'],
    'department-letters': ['back_button', 'search', 'refresh_button', 'tab_filter', 'tray_selector'],
    'profile': ['save_button', 'password_field', 'avatar_upload', 'username_field']
};

const withDefaultFieldPermissions = (pageName, raw = {}) => {
    const keys = PAGE_FIELD_PRESETS[pageName] || ['search', 'save_button'];
    const normalized = {};
    for (const key of keys) {
        normalized[key] = Object.prototype.hasOwnProperty.call(raw || {}, key) ? raw[key] : true;
    }
    return normalized;
};

class RolePermissionController {
    static async getAll(req, res) {
        try {
            const results = await RolePermission.findAll({
                include: [{ model: Role }]
            });
            res.json(results);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getByRole(req, res) {
        try {
            const roleId = req.params.roleId;
            let results = await RolePermission.findAll({
                where: { role_id: roleId }
            });

            const pages = await SystemPage.findAll({ attributes: ['page_id'] });
            const existingPageNames = new Set(results.map(r => r.page_name));
            const missingPages = pages
                .map(p => p.page_id)
                .filter(pageId => !existingPageNames.has(pageId));

            if (missingPages.length > 0) {
                const toCreate = missingPages.map(pageId => ({
                    role_id: roleId,
                    page_name: pageId,
                    can_view: false,
                    can_create: false,
                    can_edit: false,
                    can_delete: false,
                    can_special: false,
                    field_permissions: withDefaultFieldPermissions(pageId, {})
                }));
                await RolePermission.bulkCreate(toCreate, { ignoreDuplicates: true });
                
                results = await RolePermission.findAll({
                    where: { role_id: roleId }
                });
            }

            const normalized = results.map((record) => ({
                ...record.toJSON(),
                field_permissions: withDefaultFieldPermissions(record.page_name, record.field_permissions)
            }));
            res.json(normalized);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateMultiple(req, res) {
        try {
            const { role_id, permissions } = req.body;

            if (!role_id || !Array.isArray(permissions)) {
                return res.status(400).json({ error: 'Invalid payload' });
            }

            const toUpsert = permissions.map(p => ({
                role_id,
                page_name: p.page_name,
                can_view: !!p.can_view,
                can_create: !!p.can_create,
                can_edit: !!p.can_edit,
                can_delete: !!p.can_delete,
                can_special: !!p.can_special,
                field_permissions: withDefaultFieldPermissions(p.page_name, p.field_permissions)
            }));

            // Using bulkCreate with updateOnDuplicate if supported, otherwise manual batched upsert
            // For SQLite, bulkCreate with ignoreDuplicates/updateOnDuplicate is most efficient
            await RolePermission.bulkCreate(toUpsert, {
                updateOnDuplicate: ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_special', 'field_permissions']
            });

            res.json({ message: 'Permissions updated successfully' });
        } catch (error) {
            console.error('Update multiple failed:', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async getRolesWithPermissions(req, res) {
        try {
            const roles = await Role.findAll({
                attributes: {
                    include: [
                        [
                            sequelize.literal(`(
                                SELECT COUNT(*)
                                FROM directus_users as users
                                WHERE users.role = Role.id
                            )`),
                            'user_count'
                        ]
                    ]
                }
                // Removed the include: RolePermission to speed up role listing
            });
            res.json(roles);
        } catch (error) {
            console.error("Failed to fetch roles with user counts:", error);
            res.status(500).json({ error: error.message });
        }
    }

    static async getRoles(req, res) {
        try {
            const roles = await Role.findAll();
            res.json(roles);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = RolePermissionController;
