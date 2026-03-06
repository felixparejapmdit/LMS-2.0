const { RolePermission, Role, SystemPage } = require('../models/associations');
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
                await sequelize.transaction(async (t) => {
                    for (const pageId of missingPages) {
                        await RolePermission.create({
                            role_id: roleId,
                            page_name: pageId,
                            can_view: false,
                            can_create: false,
                            can_edit: false,
                            can_delete: false,
                            can_special: false,
                            field_permissions: withDefaultFieldPermissions(pageId, {})
                        }, { transaction: t });
                    }
                });
            }

            results = await RolePermission.findAll({
                where: { role_id: req.params.roleId }
            });

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

            // Basic validation
            if (!role_id || !Array.isArray(permissions)) {
                return res.status(400).json({ error: 'Invalid payload' });
            }

            // Transactional update for data integrity
            await sequelize.transaction(async (t) => {
                for (const p of permissions) {
                    const { page_name, can_view, can_create, can_edit, can_delete, can_special, field_permissions } = p;
                    const normalizedFields = withDefaultFieldPermissions(page_name, field_permissions);

                    // Manually find and update or create to avoid upsert issues with custom unique indexes
                    const [record, created] = await RolePermission.findOrCreate({
                        where: { role_id, page_name },
                        defaults: {
                            can_view: !!can_view,
                            can_create: !!can_create,
                            can_edit: !!can_edit,
                            can_delete: !!can_delete,
                            can_special: !!can_special,
                            field_permissions: normalizedFields
                        },
                        transaction: t
                    });

                    if (!created) {
                        await record.update({
                            can_view: !!can_view,
                            can_create: !!can_create,
                            can_edit: !!can_edit,
                            can_delete: !!can_delete,
                            can_special: !!can_special,
                            field_permissions: normalizedFields
                        }, { transaction: t });
                    }
                }
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
                include: [{ model: RolePermission, as: 'permissions' }]
            });
            res.json(roles);
        } catch (error) {
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
