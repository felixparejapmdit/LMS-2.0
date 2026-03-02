const sequelize = require('./src/config/db');

async function fixDates() {
    try {
        console.log('Fixing numeric dates in letters table...');
        const [letters] = await sequelize.query('SELECT id, date_received FROM letters');

        for (const letter of letters) {
            if (typeof letter.date_received === 'number') {
                const dateStr = new Date(letter.date_received).toISOString();
                console.log(`Updating letter ${letter.id}: ${letter.date_received} -> ${dateStr}`);
                await sequelize.query('UPDATE letters SET date_received = ? WHERE id = ?', {
                    replacements: [dateStr.replace('T', ' ').replace('Z', ''), letter.id]
                });
            }
        }

        console.log('Date fix complete.');
        process.exit(0);
    } catch (error) {
        console.error('Fix failed:', error);
        process.exit(1);
    }
}

fixDates();
