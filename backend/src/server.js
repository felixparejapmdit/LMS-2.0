
require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/db');
const { Person, User, Endorsement, RolePermission, SystemPage, LetterKind, Status, ProcessStep, Letter, Tray, LetterAssignment, LetterLog, Attachment, Comment, LinkLetter, Role } = require('./models/associations');

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');

        // Improve sqlite concurrency behavior when shared with Directus.
        await sequelize.query('PRAGMA busy_timeout = 10000');
        // Use DELETE mode for maximum compatibility on Windows shared volumes
        await sequelize.query('PRAGMA journal_mode = DELETE');
        await sequelize.query('PRAGMA synchronous = FULL');

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

        // 3. Specific Index Fixes
        try {
            await sequelize.query("CREATE UNIQUE INDEX IF NOT EXISTS role_page_unique ON role_permissions (role_id, page_name)");
        } catch (idxErr) { }

        // Start listening
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

startServer();
