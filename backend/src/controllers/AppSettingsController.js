const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '../config/app_settings.json');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const UPLOADS_DIR_RESOLVED = path.resolve(UPLOADS_DIR);

const safeUnlinkUploadUrl = (uploadUrl) => {
    try {
        if (!uploadUrl || typeof uploadUrl !== 'string') return;
        if (!uploadUrl.startsWith('/uploads/')) return;
        const filename = uploadUrl.replace('/uploads/', '');
        const fullPath = path.resolve(path.join(UPLOADS_DIR, filename));
        if (!fullPath.startsWith(UPLOADS_DIR_RESOLVED + path.sep)) return;
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (e) {
        // Non-blocking: stale/missing files shouldn't break settings updates.
        console.warn('Failed to delete old upload:', e.message || e);
    }
};

const getSettingsData = () => {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error("Failed to read settings file", e);
    }
    return {
        favicon: null,
        sidebar_logo: null,
        login_logo: null,
        system_theme: 'default'
    };
};

class AppSettingsController {
    static async getSettings(req, res) {
        try {
            const data = getSettingsData();
            return res.json(data);
        } catch (error) {
            console.error("Error in getSettings:", error);
            return res.status(500).json({ error: "Failed to get app settings" });
        }
    }

    static async saveSettings(req, res) {
        try {
            const currentSettings = getSettingsData();
            const { system_theme, reset_favicon, reset_sidebar_logo, reset_login_logo } = req.body;

            if (system_theme) {
                currentSettings.system_theme = system_theme;
            }

            // Handle resets
            if (reset_favicon === 'true' || reset_favicon === true) {
                safeUnlinkUploadUrl(currentSettings.favicon);
                currentSettings.favicon = null;
            }
            if (reset_sidebar_logo === 'true' || reset_sidebar_logo === true) {
                safeUnlinkUploadUrl(currentSettings.sidebar_logo);
                currentSettings.sidebar_logo = null;
            }
            if (reset_login_logo === 'true' || reset_login_logo === true) {
                safeUnlinkUploadUrl(currentSettings.login_logo);
                currentSettings.login_logo = null;
            }

            // Handle file uploads (replace existing uploads)
            if (req.files) {
                if (req.files.favicon && req.files.favicon[0]) {
                    safeUnlinkUploadUrl(currentSettings.favicon);
                    currentSettings.favicon = `/uploads/${req.files.favicon[0].filename}`;
                }
                if (req.files.sidebar_logo && req.files.sidebar_logo[0]) {
                    safeUnlinkUploadUrl(currentSettings.sidebar_logo);
                    currentSettings.sidebar_logo = `/uploads/${req.files.sidebar_logo[0].filename}`;
                }
                if (req.files.login_logo && req.files.login_logo[0]) {
                    safeUnlinkUploadUrl(currentSettings.login_logo);
                    currentSettings.login_logo = `/uploads/${req.files.login_logo[0].filename}`;
                }
            }

            // Save back to JSON file
            const dir = path.dirname(SETTINGS_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(currentSettings, null, 2), 'utf8');

            return res.json(currentSettings);
        } catch (error) {
            console.error("Error in saveSettings:", error);
            return res.status(500).json({ error: "Failed to save app settings" });
        }
    }
}

module.exports = AppSettingsController;
