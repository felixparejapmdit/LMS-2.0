const Tray = require('./src/models/Tray');
async function seedTrays() {
    try {
        await Tray.bulkCreate([
            { tray_no: "TRAY-A1-2026", description: "Main Incoming Bin", capacity: 50 },
            { tray_no: "ARCHIVE-B4-2025", description: "Long-term Storage B4", capacity: 200 },
            { tray_no: "VIP-HOLD", description: "Special Priority Handling", capacity: 20 }
        ], { ignoreDuplicates: true });
        console.log("Trays seeded.");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
seedTrays();
