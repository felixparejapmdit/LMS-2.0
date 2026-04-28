
const path = require('path');
// Load local backend .env
require('dotenv').config();

// Also try loading root .env if it exists (for TELEGRAM variables etc.)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const axios = require('axios');
const app = require('./app');
const sequelize = require('./config/db');
const { 
    Person, User, Endorsement, RolePermission, SystemPage, 
    LetterKind, Status, ProcessStep, Letter, Tray, 
    LetterAssignment, LetterLog, Attachment, Comment, 
    LinkLetter, Role, RefSectionRegistry, DeptSectionUsage, AuditLog 
} = require('./models/associations');

const PORT = process.env.PORT || 5000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

const setupTelegramWebhook = async () => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_WEBHOOK_URL) {
        console.log('Telegram BOT: Webhook not configured (missing TOKEN or URL).');
        return;
    }

    let finalWebhookUrl = TELEGRAM_WEBHOOK_URL;
    // Auto-fix: if the user provided just the domain, append the correct API path
    if (!finalWebhookUrl.endsWith('/api/telegram/webhook')) {
        // Ensure no trailing slash before appending
        const base = finalWebhookUrl.replace(/\/$/, '');
        finalWebhookUrl = `${base}/api/telegram/webhook`;
    }

    console.log(`Telegram BOT: Attempting to set webhook to: ${finalWebhookUrl}`);

    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
            { 
                url: finalWebhookUrl,
                allowed_updates: ["message", "callback_query"] 
            },
            { timeout: 10000 }
        );

        if (!response.data?.ok) {
            console.error('Telegram BOT: Setup FAILED:', response.data);
            return;
        }
        console.log('Telegram BOT: Webhook successfully linked.');
    } catch (err) {
        const errorDetail = err.response?.data || err.message;
        console.error('Telegram BOT: Setup ERROR:', errorDetail);
    }
};

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');

        // Helper to safely add columns (safer than sync({alter:true}) for SQLite)
        const ensureColumn = async (table, col, definition) => {
            try {
                await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`);
                console.log(`Added missing column ${col} to ${table}.`);
            } catch (e) {
                const msg = e.message.toLowerCase();
                if (!msg.includes('duplicate column name') && !msg.includes('already exists')) {
                    console.warn(`Column check (${col}) in table ${table} warning:`, e.message);
                }
            }
        };

        // 1. Manually Sync Tables (Safe for Create If Not Exists)
        const models = [
            Person, User, Endorsement, RolePermission, SystemPage,
            LetterKind, Status, ProcessStep, Letter, Tray,
            LetterAssignment, LetterLog, Attachment, Comment,
            LinkLetter, Role, RefSectionRegistry, DeptSectionUsage, AuditLog
        ];

        for (const model of models) {
            try {
                // Sync without alter/force just creates if missing
                await model.sync();
            } catch (e) {
                console.warn(`Initial sync for ${model.name} skipped:`, e.message);
            }
        }

        // 1.5. Seed Registry if empty
        try {
            const count = await RefSectionRegistry.count();
            if (count === 0) {
                console.log('[DATABASE] Seeding Section Registry (01-99)...');
                const sections = [];
                for (let i = 1; i <= 99; i++) {
                    sections.push({ section_code: i.toString().padStart(2, '0'), status: 'AVAILABLE' });
                }
                await RefSectionRegistry.bulkCreate(sections);
                console.log('[DATABASE] Seeding complete.');
            }
        } catch (seedErr) {
            console.warn('[DATABASE] Registry seeding failed:', seedErr.message);
        }

        // 2. Self-Healing: Specific Column additions (Legacy/Directus tables)
        await ensureColumn('person', 'telegram_chat_id', 'VARCHAR(255)');
        await ensureColumn('directus_users', 'layout_style', "VARCHAR(255) DEFAULT 'notion'");
        await ensureColumn('directus_users', 'theme_preference', "VARCHAR(255) DEFAULT 'light'");
        await ensureColumn('directus_users', 'telegram_chat_id', "VARCHAR(255)");
        await ensureColumn('letter_logs', 'step_id', "INTEGER");
        await ensureColumn('letter_logs', 'department_id', "INTEGER");
        await ensureColumn('letter_logs', 'status_id', "INTEGER");
        await ensureColumn('dept_section_usage', 'year', "INTEGER");

        // Normalize any invalid tray_id=0 back to NULL (FK-safe unassigned tray)
        try {
            await sequelize.query("UPDATE letters SET tray_id = NULL WHERE tray_id = 0");
        } catch (e) {
            console.warn("Tray ID cleanup skipped:", e.message);
        }

        // 3. Specific Index & UI Performance Fixes
        try {
            await sequelize.query("CREATE UNIQUE INDEX IF NOT EXISTS role_page_unique ON role_permissions (role_id, page_name)");
            
            // Performance Indexes for Dashboard/Inbox
            const performanceIndexes = [
                "CREATE INDEX IF NOT EXISTS idx_letters_dept ON letters (dept_id)",
                "CREATE INDEX IF NOT EXISTS idx_letters_tray ON letters (tray_id)",
                "CREATE INDEX IF NOT EXISTS idx_letters_status ON letters (global_status)",
                "CREATE INDEX IF NOT EXISTS idx_letters_encoder ON letters (encoder_id)",
                "CREATE INDEX IF NOT EXISTS idx_users_dept ON directus_users (dept_id)",
                "CREATE INDEX IF NOT EXISTS idx_assignments_letter ON letter_assignments (letter_id)",
                "CREATE INDEX IF NOT EXISTS idx_assignments_dept ON letter_assignments (department_id)",
                "CREATE INDEX IF NOT EXISTS idx_endorsements_letter ON endorsements (letter_id)"
            ];

            for (const sql of performanceIndexes) {
                await sequelize.query(sql).catch(e => {
                    // Ignore index creation errors if they already exist in a different format
                    if (!e.message.toLowerCase().includes('already exists')) {
                        console.warn(`[DATABASE] Index optimization suppressed: ${e.message}`);
                    }
                });
            }
            console.log('[DATABASE] Performance indexes verified.');
        } catch (idxErr) {
            console.warn('[DATABASE] Index optimization skipped:', idxErr.message);
        }

        // Start listening on all network interfaces (bind to 0.0.0.0)
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\x1b[32m✔\x1b[0m Server is running on port ${PORT}`);
            
            // Log local network IPs to help the user connect from other devices
            const os = require('os');
            const interfaces = os.networkInterfaces();
            console.log('Available on your network:');
            console.log(`  - Local:   http://localhost:${PORT}`);
            for (const name of Object.keys(interfaces)) {
                for (const iface of interfaces[name]) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        console.log(`  - Network: http://${iface.address}:${PORT}`);
                    }
                }
            }
        });

        setupTelegramWebhook().catch(() => { });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

startServer();
