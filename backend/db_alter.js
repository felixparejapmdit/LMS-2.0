const sequelize = require('./src/config/db');
const LetterLog = require('./src/models/LetterLog');

async function run() {
    try {
        await sequelize.query('ALTER TABLE letter_logs ADD COLUMN action_type VARCHAR(255) DEFAULT "System"');
    } catch (e) { }
    try {
        await sequelize.query('ALTER TABLE letter_logs ADD COLUMN department_id INTEGER');
    } catch (e) { }
    try {
        await sequelize.query('ALTER TABLE letter_logs ADD COLUMN log_details TEXT DEFAULT "Legacy Record"');
    } catch (e) { }
    try {
        await sequelize.query('ALTER TABLE letter_logs ADD COLUMN timestamp DATETIME DEFAULT CURRENT_TIMESTAMP');
    } catch (e) { }

    // Copy old data to new columns if old columns exist
    try {
        await sequelize.query('UPDATE letter_logs SET log_details = action_taken WHERE action_taken IS NOT NULL');
    } catch (e) { }
    try {
        await sequelize.query('UPDATE letter_logs SET timestamp = log_date WHERE log_date IS NOT NULL');
    } catch (e) { }

    // Let sequelize do the rest
    await LetterLog.sync({ alter: true });
    console.log("Migration successful.");
    process.exit();
}
run();
