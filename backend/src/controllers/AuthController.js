const { User, Role, RolePermission, Department, SystemPage } = require('../models/associations');
const axios = require('axios');
const sequelize = require('../config/db');

const DIRECTUS_URL = process.env.DIRECTUS_INTERNAL_URL || 'http://localhost:8055';
const PERMS_CACHE_TTL_MS = Number.parseInt(process.env.PERMS_CACHE_TTL_MS || '60000', 10);
const permsCache = new Map();

let cachedPages = null;
let cachedPagesTimestamp = 0;
const PAGES_CACHE_TTL = 600000; // 10 minutes

const getCachedPerms = (roleId) => {
    if (!roleId || !Number.isFinite(PERMS_CACHE_TTL_MS) || PERMS_CACHE_TTL_MS <= 0) return null;
    const cached = permsCache.get(roleId);
    if (!cached) return null;
    if (cached.expiresAt < Date.now()) {
        permsCache.delete(roleId);
        return null;
    }
    return cached.value;
};

const setCachedPerms = (roleId, value) => {
    if (!roleId || !Number.isFinite(PERMS_CACHE_TTL_MS) || PERMS_CACHE_TTL_MS <= 0) return;
    permsCache.set(roleId, { value, expiresAt: Date.now() + PERMS_CACHE_TTL_MS });
};

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
    let data = raw;
    try {
        if (typeof raw === 'string') data = JSON.parse(raw);
    } catch (e) {
        data = {};
    }

    const keys = PAGE_FIELD_PRESETS[pageName] || ['search', 'save_button'];
    const normalized = {};
    const source = (data && typeof data === 'object') ? data : {};

    for (const key of keys) {
        normalized[key] = Object.prototype.hasOwnProperty.call(source, key) ? source[key] : true;
    }
    return normalized;
};

const normalizePermissions = (perms) => perms.map((record) => {
    const data = record.toJSON();
    return {
        ...data,
        field_permissions: withDefaultFieldPermissions(data.page_name, data.field_permissions)
    };
});

class AuthController {
    static async login(req, res) {
        const startTime = Date.now();
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }

            console.log(`[LOGIN] Attempt started for: ${username}`);

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
                console.warn(`[LOGIN] User not found: ${username}`);
                return res.status(401).json({ error: 'User not found' });
            }

            const [directusAuth, dbPerms] = await Promise.all([
                (async () => {
                    try {
                        const directusLoginStart = Date.now();
                        const response = await axios.post(`${DIRECTUS_URL}/auth/login`, {
                            email: user.email,
                            password: password
                        }, { timeout: 8000 });
                        console.log(`[LOGIN] Directus auth took ${Date.now() - directusLoginStart}ms`);
                        return response.data;
                    } catch (err) {
                        console.error(`[LOGIN] Directus auth failed for ${user.email}:`, err.message);
                        throw new Error('Invalid credentials');
                    }
                })(),
                RolePermission.findAll({ where: { role_id: user.role } })
            ]);

            let perms = dbPerms;

            if (!cachedPages || (Date.now() - cachedPagesTimestamp > PAGES_CACHE_TTL)) {
                cachedPages = await SystemPage.findAll({ attributes: ['page_id'] });
                cachedPagesTimestamp = Date.now();
            }

            if (perms.length < cachedPages.length) {
                const existingPageNames = new Set(perms.map(r => r.page_name));
                const missingPages = cachedPages.filter(p => !existingPageNames.has(p.page_id));
                
                if (missingPages.length > 0) {
                    console.log(`[LOGIN] Syncing ${missingPages.length} missing permissions...`);
                    const toCreate = missingPages.map(page => ({
                        role_id: user.role,
                        page_name: page.page_id,
                        can_view: false,
                        can_create: false,
                        can_edit: false,
                        can_delete: false,
                        can_special: false,
                        field_permissions: withDefaultFieldPermissions(page.page_id, {})
                    }));
                    await RolePermission.bulkCreate(toCreate, { ignoreDuplicates: true });
                    perms = await RolePermission.findAll({ where: { role_id: user.role } });
                }
            }

            const normalizedPerms = normalizePermissions(perms);
            setCachedPerms(user.role, normalizedPerms);

            user.update({ islogin: true }).catch(() => { });

            console.log(`[LOGIN] Success for ${username} in ${Date.now() - startTime}ms`);

            res.json({
                success: true,
                user,
                permissions: normalizedPerms,
                directus_auth: directusAuth.data
            });

        } catch (error) {
            console.error(`[LOGIN] Failure in ${Date.now() - startTime}ms:`, error.message);
            res.status(error.message === 'Invalid credentials' ? 401 : 500).json({ error: error.message });
        }
    }

    static async getConfig(req, res) {
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

            let normalizedPerms = getCachedPerms(user.role);
            if (!normalizedPerms) {
                const perms = await RolePermission.findAll({
                    where: { role_id: user.role }
                });
                normalizedPerms = normalizePermissions(perms);
                setCachedPerms(user.role, normalizedPerms);
            }

            res.json({
                user,
                permissions: normalizedPerms
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getGuestConfig(req, res) {
        try {
            const guestRole = await Role.findOne({
                where: sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('name')),
                    'guest'
                )
            });

            if (!guestRole) {
                // Return empty permissions instead of 500 if Guest role is missing from DB
                return res.json({ permissions: [] });
            }

            const perms = await RolePermission.findAll({
                where: { role_id: guestRole.id }
            });

            res.json({ permissions: normalizePermissions(perms) });
        } catch (error) {
            console.error("Guest config fetch failed:", error);
            res.json({ permissions: [] }); // Graceful fallback
        }
    }
}

module.exports = AuthController;
