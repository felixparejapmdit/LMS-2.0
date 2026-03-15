const { User, Role, RolePermission, Department, SystemPage } = require('../models/associations');
const axios = require('axios');
const sequelize = require('../config/db');

const DIRECTUS_URL = process.env.DIRECTUS_INTERNAL_URL || 'http://directus:8055';

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

class AuthController {
    static async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }

            // 1. Find user by username or email in our shared DB
            const user = await User.findOne({
                where: sequelize.or(
                    { username: username },
                    { email: username }
                ),
                include: [
                    { model: Department, as: 'department' },
                    { model: Role, as: 'roleData' }
                ]
            });

            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }

            // 2. Authenticate with Directus (this validates the password)
            let directusAuth;
            try {
                const response = await axios.post(`${DIRECTUS_URL}/auth/login`, {
                    email: user.email,
                    password: password
                });
                directusAuth = response.data;
            } catch (err) {
                console.error("Directus login failed for user:", user.email);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // 3. Fetch User Permissions
            let perms = await RolePermission.findAll({
                where: { role_id: user.role }
            });

            // Ensure all pages have a record (same logic as RolePermissionController)
            const pages = await SystemPage.findAll({ attributes: ['page_id'] });
            const existingPageNames = new Set(perms.map(r => r.page_name));
            const missingPages = pages
                .map(p => p.page_id)
                .filter(pageId => !existingPageNames.has(pageId));

            if (missingPages.length > 0) {
                await sequelize.transaction(async (t) => {
                    for (const pageId of missingPages) {
                        await RolePermission.create({
                            role_id: user.role,
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
                // Re-fetch after creation
                perms = await RolePermission.findAll({
                    where: { role_id: user.role }
                });
            }

            const normalizedPerms = perms.map((record) => ({
                ...record.toJSON(),
                field_permissions: withDefaultFieldPermissions(record.page_name, record.field_permissions)
            }));

            // 4. Update islogin status (non-blocking)
            user.update({ islogin: true }).catch(() => { });

            // 5. Return everything in one shot
            res.json({
                success: true,
                user: user,
                permissions: normalizedPerms,
                directus_auth: directusAuth.data
            });

        } catch (error) {
            console.error("Combined login failed:", error);
            res.status(500).json({ error: error.message });
        }
    }

    static async getConfig(req, res) {
        // Combined endpoint for App initialization (User + Permissions)
        // Usually called with a valid Directus token in headers
        try {
            const { userId } = req.query;
            if (!userId) return res.status(400).json({ error: 'User ID required' });

            const user = await User.findByPk(userId, {
                include: [
                    { model: Department, as: 'department' },
                    { model: Role, as: 'roleData' }
                ]
            });

            if (!user) return res.status(404).json({ error: 'User not found' });

            const perms = await RolePermission.findAll({
                where: { role_id: user.role }
            });

            const normalizedPerms = perms.map((record) => ({
                ...record.toJSON(),
                field_permissions: withDefaultFieldPermissions(record.page_name, record.field_permissions)
            }));

            res.json({
                user,
                permissions: normalizedPerms
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = AuthController;
