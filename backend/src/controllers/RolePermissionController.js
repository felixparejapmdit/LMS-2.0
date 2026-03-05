const { RolePermission, Role, SystemPage } = require('../models/associations');
const sequelize = require('../config/db');
const PAGE_FIELD_PRESETS = {
    'letter-tracker': ['search'],
    'master-table': ['search', 'edit_button', 'delete_button', 'status_dropdown', 'department_selector', 'step_selector', 'pdf_button', 'save_button', 'attachment_upload', 'endorse_button'],
    'new-letter': ['sender_field', 'summary_field', 'status_dropdown', 'department_selector', 'attachment_upload', 'save_button'],
    'vip-view': ['search', 'comment_box', 'submit_button', 'pdf_button'],
    'guest-send-letter': ['sender_field', 'summary_field', 'attachment_upload', 'submit_button'],
    'endorsements': ['search', 'print_button', 'delete_button', 'view_button'],
    'letters-with-comments': ['search', 'comment_box', 'pdf_button'],
    'upload-pdf': ['attachment_upload', 'search', 'save_button'],
    'users': ['search', 'add_button', 'edit_button', 'delete_button', 'save_button'],
    'departments': ['search', 'add_button', 'edit_button', 'delete_button', 'save_button'],
    'persons': ['search', 'add_button', 'edit_button', 'delete_button', 'save_button'],
    'letter-kinds': ['search', 'add_button', 'edit_button', 'delete_button', 'save_button'],
    'statuses': ['search', 'add_button', 'edit_button', 'delete_button', 'save_button'],
    'process-steps': ['search', 'add_button', 'edit_button', 'delete_button', 'save_button'],
    'trays': ['search', 'add_button', 'edit_button', 'delete_button', 'save_button'],
    'role-matrix': ['search', 'save_button', 'edit_field'],
    'settings': ['save_button']
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
