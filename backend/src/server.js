
require('dotenv').config();
const axios = require('axios');
const app = require('./app');
const sequelize = require('./config/db');
const { Person, User, Endorsement, RolePermission, SystemPage, LetterKind, Status, ProcessStep, Letter, Tray, LetterAssignment, LetterLog, Attachment, Comment, LinkLetter, Role } = require('./models/associations');

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

        // Improve sqlite concurrency behavior when shared with Directus.
        const sqliteBusyTimeout = Number.parseInt(process.env.SQLITE_BUSY_TIMEOUT || '10000', 10);
        const journalModeEnv = (process.env.SQLITE_JOURNAL_MODE || 'DELETE').toUpperCase();
        const synchronousEnv = (process.env.SQLITE_SYNCHRONOUS || 'FULL').toUpperCase();
        const allowedJournalModes = new Set(['DELETE', 'WAL', 'TRUNCATE', 'PERSIST', 'MEMORY', 'OFF']);
        const allowedSynchronous = new Set(['OFF', 'NORMAL', 'FULL', 'EXTRA']);
        const sqliteJournalMode = allowedJournalModes.has(journalModeEnv) ? journalModeEnv : 'DELETE';
        const sqliteSynchronous = allowedSynchronous.has(synchronousEnv) ? synchronousEnv : 'FULL';
        await sequelize.query(`PRAGMA busy_timeout = ${Number.isFinite(sqliteBusyTimeout) ? sqliteBusyTimeout : 10000}`);
        // Use DELETE mode for maximum compatibility on Windows shared volumes
        await sequelize.query(`PRAGMA journal_mode = ${sqliteJournalMode}`);
        await sequelize.query(`PRAGMA synchronous = ${sqliteSynchronous}`);

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
            LinkLetter, Role
        ];

        for (const model of models) {
            try {
                // Sync without alter/force just creates if missing
                await model.sync();
            } catch (e) {
                console.warn(`Initial sync for ${model.name} skipped:`, e.message);
            }
        }

        // 2. Self-Healing: Specific Column additions (Legacy/Directus tables)
        await ensureColumn('person', 'telegram_chat_id', 'VARCHAR(255)');
        await ensureColumn('directus_users', 'layout_style', "VARCHAR(255) DEFAULT 'notion'");
        await ensureColumn('directus_users', 'theme_preference', "VARCHAR(255) DEFAULT 'light'");
        await ensureColumn('directus_users', 'telegram_chat_id', "VARCHAR(255)");

        // Normalize any invalid tray_id=0 back to NULL (FK-safe unassigned tray)
        try {
            await sequelize.query("UPDATE letters SET tray_id = NULL WHERE tray_id = 0");
        } catch (e) {
            console.warn("Tray ID cleanup skipped:", e.message);
        }

        // 3. Specific Index Fixes
        try {
            await sequelize.query("CREATE UNIQUE INDEX IF NOT EXISTS role_page_unique ON role_permissions (role_id, page_name)");
        } catch (idxErr) { }

        // Start listening
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

        setupTelegramWebhook().catch(() => { });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

startServer();
