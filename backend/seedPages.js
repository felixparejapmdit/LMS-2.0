const { SystemPage } = require('./src/models/associations');
const sequelize = require('./src/config/db');

const PAGES = [
    { page_id: "home", page_name: "Home Dashboard" },
    { page_id: "inbox", page_name: "Inbox" },
    { page_id: "outbox", page_name: "Outbox" },
    { page_id: "new-letter", page_name: "New Letter" },
    { page_id: "master-table", page_name: "Master Table" },
    { page_id: "letters-with-comments", page_name: "Letters with Comment" },
    { page_id: "letter-tracker", page_name: "Letter Tracker" },
    { page_id: "upload-pdf", page_name: "Upload PDF Files" },
    { page_id: "spam", page_name: "Spam" },
    { page_id: "endorsements", page_name: "Endorsements" },
    { page_id: "settings", page_name: "App Settings" },
    { page_id: "trays", page_name: "Tray Management" },
    { page_id: "users", page_name: "User Management" },
    { page_id: "contacts", page_name: "Contact Management" },
    { page_id: "departments", page_name: "Department Management" },
    { page_id: "kinds", page_name: "Letter Kinds" },
    { page_id: "steps", page_name: "Workflow Steps" },
    { page_id: "statuses", page_name: "Status Management" },
    { page_id: "attachments", page_name: "Attachment Library" },
    { page_id: "role-matrix", page_name: "Access Matrix" }
];

async function seedPages() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        for (const p of PAGES) {
            await SystemPage.upsert(p);
            console.log(`Synced page: ${p.page_id}`);
        }

        console.log('Seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedPages();
