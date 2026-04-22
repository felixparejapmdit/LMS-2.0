const { User, Role, RolePermission, Department, SystemPage } = require('../models/associations');
const axios = require('axios');
const http = require('http');
const https = require('https');
const sequelize = require('../config/db');
const { Sequelize, Op } = require('sequelize');
const argon2 = require('argon2');

const DIRECTUS_URL = process.env.DIRECTUS_INTERNAL_URL || 'http://localhost:8055';
const PERMS_CACHE_TTL_MS = Number.parseInt(process.env.PERMS_CACHE_TTL_MS || '600000', 10);
const permsCache = new Map();

const directusClient = axios.create({
    baseURL: DIRECTUS_URL,
    timeout: 10000,
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true })
});

let cachedPages = null;
let cachedPagesTimestamp = 0;
const PAGES_CACHE_TTL = 3600000;

// Heuristic cache to avoid "try email then username" every login.
// Most installs treat Directus "email" as the LMS username, so default to username first.
const directusLoginHint = new Map();

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
    'master-table': ['search', 'edit_button', 'delete_button', 'status_dropdown', 'department_selector', 'step_selector', 'pdf_button', 'save_button', 'attachment_upload', 'endorse_button', 'track_button', 'print_qr_button', 'refresh_button'],
    'letters-with-comments': ['search', 'pdf_button', 'tab_filter', 'refresh_button'],
    'letter-tracker': ['search', 'pdf_button', 'track_button', 'print_qr_button', 'refresh_button'],
    'upload-pdf': ['attachment_upload', 'save_button', 'pdf_button', 'delete_button', 'view_toggle'],
    'guest-send-letter': ['sender_field', 'encoder_field', 'summary_field', 'attachment_selector', 'kind_dropdown', 'attachment_upload', 'submit_button', 'clear_button'],
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
    'role-matrix': ['search', 'save_button', 'edit_field', 'allow_all_button', 'restrict_button', 'role_selector', 'department_filter'],
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
        const timings = {};
        const lap = (name) => { timings[name] = Date.now() - startTime; };

        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }

            // STEP 1: PARALLEL LOCAL LOOKUP
            const [user, systemPages] = await Promise.all([
                User.findOne({
                    where: { [Op.or]: [{ username }, { email: username }] },
                    include: ['roleData', 'department']
                }),
                (!cachedPages || (Date.now() - cachedPagesTimestamp > PAGES_CACHE_TTL)) 
                    ? SystemPage.findAll({ attributes: ['page_id'] }) 
                    : Promise.resolve(cachedPages)
            ]);

            lap('Local Resolve');

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials (User not found)' });
            }

            // Update page cache
            if (systemPages !== cachedPages) {
                cachedPages = systemPages;
                cachedPagesTimestamp = Date.now();
            }

            // STEP 2: LOCAL PASSWORD VERIFICATION (FAST PATH)
            let isPasswordValid = false;
            try {
                isPasswordValid = await argon2.verify(user.password, password);
                lap('Local Pwd Check');
            } catch (err) {
                console.error('[LOGIN] Argon2 Error:', err);
            }

            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // STEP 3: ASYNC DIRECTUS AUTH
            const directusAuthPromise = (async () => {
                const directusStart = Date.now();
                const hint = directusLoginHint.get(user.id) || 'username';
                const candidates = [];

                if (hint === 'email' && user.email) candidates.push(user.email);
                candidates.push(user.username);
                if (user.email) candidates.push(user.email);

                // De-dupe and drop empties
                const uniq = candidates.filter(Boolean).filter((v, idx, arr) => arr.indexOf(v) === idx);

                for (const identifier of uniq) {
                    try {
                        const response = await directusClient.post('/auth/login', {
                            email: identifier,
                            password: password
                        });
                        timings['Directus Login'] = Date.now() - directusStart;
                        directusLoginHint.set(user.id, identifier === user.email ? 'email' : 'username');
                        return response.data;
                    } catch {
                        // try next identifier
                    }
                }
                timings['Directus Login'] = Date.now() - directusStart;
                return null;
            })();

            // STEP 4: FETCH PERMISSIONS (PARALLEL)
            let normalizedPerms = getCachedPerms(user.role);
            const permissionsPromise = !normalizedPerms 
                ? RolePermission.findAll({ where: { role_id: user.role } })
                : Promise.resolve(null);

            // STEP 5: WAIT FOR PERMISSIONS + DIRECTUS TOKEN
            const [permsResult, directusAuth] = await Promise.all([permissionsPromise, directusAuthPromise]);

            if (!directusAuth) {
                return res.status(503).json({ error: 'Authentication provider unavailable. Please try again.' });
            }

            if (permsResult) {
                normalizedPerms = normalizePermissions(permsResult);
                setCachedPerms(user.role, normalizedPerms);
                lap('Permission Fetch');
            } else {
                lap('Permission Cache Hit');
            }
            lap('Data Prepared');

            // Background update
            User.update({ islogin: true }, { where: { id: user.id } }).catch(() => {});

            console.log(`[LOGIN] Fast-path successful for ${user.username} in ${Date.now() - startTime}ms. Directus: READY`);

            return res.json({
                success: true,
                user: {
                    ...user.get({ plain: true }),
                    systemPages: systemPages.map(p => p.page_id)
                },
                permissions: normalizedPerms || [], // ROOT LEVEL as expected by frontend
                directus_auth: directusAuth?.data || directusAuth,
                timings
            });

        } catch (error) {
            console.error(`[LOGIN] Critical Failure:`, error.message);
            res.status(500).json({ error: 'Authentication service error' });
        }
    }

    static async getConfig(req, res) {
        try {
            const authHeader = req.headers?.authorization || '';
            const match = authHeader.match(/^Bearer\s+(.+)$/i);
            if (!match) return res.status(401).json({ error: 'Missing Authorization token' });

            const token = match[1];
            const meRes = await directusClient.get('/users/me', {
                headers: { Authorization: `Bearer ${token}` },
                params: { fields: 'id' }
            });
            const directusUserId = meRes?.data?.data?.id ?? meRes?.data?.id;
            if (!directusUserId) return res.status(401).json({ error: 'Invalid session' });

            const user = await User.findByPk(directusUserId, { include: ['roleData', 'department'] });
            if (!user) return res.status(404).json({ error: 'User not found' });

            let normalizedPerms = getCachedPerms(user.role);
            if (!normalizedPerms) {
                const perms = await RolePermission.findAll({ where: { role_id: user.role } });
                normalizedPerms = normalizePermissions(perms);
                setCachedPerms(user.role, normalizedPerms);
            }

            res.json({ user, permissions: normalizedPerms });
        } catch (error) {
            const status = error.response?.status;
            if (status === 401 || status === 403) {
                return res.status(401).json({ error: 'Invalid or expired session' });
            }
            res.status(500).json({ error: error.message });
        }
    }

    static async getGuestConfig(req, res) {
        try {
            const guestRole = await Role.findOne({
                where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), 'guest')
            });
            if (!guestRole) return res.json({ permissions: [] });

            const perms = await RolePermission.findAll({ where: { role_id: guestRole.id } });
            res.json({ permissions: normalizePermissions(perms) });
        } catch (error) {
            res.json({ permissions: [] });
        }
    }

    static clearCache(roleId = null) {
        if (roleId) {
            permsCache.delete(roleId);
            console.log(`[AUTH CACHE] Cleared for role: ${roleId}`);
        } else {
            permsCache.clear();
            console.log(`[AUTH CACHE] Cleared ALL`);
        }
    }
}

module.exports = AuthController;
