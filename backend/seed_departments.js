const sequelize = require('./src/config/db');
const Department = require('./src/models/Department');

const newDepts = [
    "AEVM'sOffice", "Archiving", "ATG's Office", "CHD / Canteen", "CFO",
    "District Office", "DNM", "EBC", "Evangelism", "Executive News Team",
    "External Affairs Office", "Finance", "Graphics and Design", "INC Engineering",
    "INC Photo", "INC-PC", "INCinema", "INCS", "INCTV / CEBSI", "Legal",
    "Ma'am Lynn", "Motorpool", "MRC", "Museum and Exhibit Dev't", "Museum Design Team",
    "Music - CDO", "Music - CFO Choirs", "Music - GMG", "Music - Hymns",
    "Music - Modern Music", "Music - Organ Office", "Music - Special Projects",
    "NEGH", "NEU", "Others", "Pasugo Layout", "Personnel", "PMD Building Admin",
    "Printing", "Purchasing", "Research", "SFM", "SFM - ATG's Office",
    "SFM - Bldg. Admin", "SFM - CLS", "SFM - Counseling Center", "SFM - Dean's Office",
    "SFM - Library", "SFM - President's Office", "SFM - Registrar", "SFM - SAO",
    "SFM - IT", "Security", "Special Projects", "SRG", "STF DGA",
    "STF Engineering and Maintenance", "STF Live Streaming WS Group", "STF Music",
    "STF NHSO", "STF Photo", "STF Programming Team", "STF Video", "STF Writers",
    "TRG", "VEM's Office"
];

function generateCode(name) {
    const words = name.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(w => w);
    if (words.length === 1) {
        return words[0].substring(0, 4).toUpperCase();
    }
    return words.map(w => w[0]).join('').substring(0, 5).toUpperCase();
}

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        await sequelize.query('PRAGMA foreign_keys = OFF;');

        // delete all rows
        await Department.destroy({ where: {} });

        // Try clearing sqlite sequence to reset auto-increment if exists
        try {
            await sequelize.query(`DELETE FROM sqlite_sequence WHERE name='ref_departments';`);
        } catch (e) {
            console.log("sqlite_sequence modification skipped");
        }

        const usedCodes = new Set();

        for (const name of newDepts) {
            let baseCode = generateCode(name);
            let code = baseCode;
            let counter = 1;
            while (usedCodes.has(code)) {
                code = `${baseCode}${counter}`;
                counter++;
            }
            usedCodes.add(code);

            await Department.create({
                dept_name: name,
                dept_code: code
            });
        }

        await sequelize.query('PRAGMA foreign_keys = ON;');
        console.log('Departments seeded successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

run();
