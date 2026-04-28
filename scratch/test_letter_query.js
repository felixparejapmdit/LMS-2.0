const { Letter, LetterAssignment, User } = require("./backend/src/models/associations");
const sequelize = require("./backend/src/config/db");
const { Op } = require("sequelize");

async function test() {
    try {
        const where = {
            global_status: 1,
            createdAt: { [Op.gte]: new Date("2026-04-27T16:00:00.000Z") }
        };

        const { count, rows } = await Letter.findAndCountAll({
            where,
            include: [
                "letterKind",
                "status",
                "attachment",
                "tray",
                {
                    model: LetterAssignment,
                    as: "assignments",
                    include: ["step", "department"],
                    required: false,
                }
            ],
            order: [["created_at", "DESC"]],
            limit: 500,
            distinct: true,
            subQuery: false,
        });

        console.log("Count:", count);
        process.exit(0);
    } catch (err) {
        console.error("Test failed:", err);
        process.exit(1);
    }
}

test();
