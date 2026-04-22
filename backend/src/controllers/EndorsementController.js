const { Letter, LetterKind, LetterAssignment, User, Person } = require('../models/associations');
const Endorsement = require('../models/Endorsement');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const TelegramService = require('../services/telegramService');
const ALL_LETTER_ROLES = new Set(['ADMINISTRATOR']);

// CREATE the table if it doesn't exist
(async () => {
    try {
        await Endorsement.sync();
    } catch (e) {
        console.warn('Endorsement sync warning:', e.message);
    }
})();

const buildQueryOptions = (query = {}) => {
    const { user_id, department_id, role, mine, full_name } = query;
    const where = {};
    const letterWhere = {};

    const normalizedRole = role ? role.toString().toUpperCase() : '';
    const mineOnly = `${mine}`.toLowerCase() === 'true';
    const normalizedFullName = (full_name || '').trim();

    if (mineOnly) {
        where.endorsed_to = { [Op.like]: normalizedFullName || '__NO_MATCH__' };
    }

    // USER sees endorsements specifically addressed to them only.
    if (normalizedRole === 'USER') {
        where.endorsed_to = { [Op.like]: normalizedFullName || '__NO_MATCH__' };
    } else if (!ALL_LETTER_ROLES.has(normalizedRole)) {
        // For non-admin roles (except USER), keep visibility scoped to own/dept.
        if (user_id) {
            letterWhere[Op.or] = [
                { encoder_id: user_id },
                { '$assignments.department_id$': department_id }
            ];
        }
    }

    const include = [
        {
            model: Letter,
            as: 'letter',
            where: Object.keys(letterWhere).length > 0 ? letterWhere : null,
            attributes: ['id', 'lms_id', 'sender', 'summary', 'encoder_id'],
            include: [
                { model: LetterKind, as: 'letterKind', attributes: ['kind_name'] },
                { model: LetterAssignment, as: 'assignments', attributes: ['department_id'], required: false }
            ]
        }
    ];

    return { where, include };
};

class EndorsementController {
    // GET all endorsements (with letter info)
    static async getAll(req, res) {
        try {
            const { where, include } = buildQueryOptions(req.query);

            const endorsements = await Endorsement.findAll({
                where,
                include,
                order: [['endorsed_at', 'DESC']]
            });

            // Enrich with Telegram availability
            const enriched = await Promise.all(endorsements.map(async (e) => {
                const data = e.toJSON();
                const personName = data.endorsed_to;
                
                let hasTelegram = false;
                let isBot = personName?.toLowerCase().includes('lms bot');
                let telegramChatId = null;

                if (isBot) {
                    hasTelegram = true;
                } else {
                    // Check User table
                    const userMatch = await User.findOne({
                        where: {
                            [Op.or]: [
                                { username: personName },
                                sequelize.literal(`"last_name" || ', ' || "first_name" = '${personName.replace(/'/g, "''")}'`),
                                sequelize.literal(`"first_name" || ' ' || "last_name" = '${personName.replace(/'/g, "''")}'`)
                            ]
                        }
                    });

                    if (userMatch && userMatch.telegram_chat_id) {
                        hasTelegram = true;
                        telegramChatId = userMatch.telegram_chat_id;
                    } else {
                        // Check Person table
                        const personMatch = await Person.findOne({
                            where: { name: personName }
                        });
                        if (personMatch && personMatch.telegram_chat_id) {
                            hasTelegram = true;
                            telegramChatId = personMatch.telegram_chat_id;
                        }
                    }
                }

                return {
                    ...data,
                    telegram_info: {
                        has_telegram: hasTelegram,
                        is_bot: isBot,
                        chat_id: telegramChatId
                    }
                };
            }));

            res.json(enriched);
        } catch (error) {
            console.error('Endorsement.getAll error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // CREATE endorsement
    static async create(req, res) {
        try {
            const { letter_id, endorsed_to, endorsed_by, notes, dept_id } = req.body;
            if (!letter_id || !endorsed_to) {
                return res.status(400).json({ error: 'letter_id and endorsed_to are required.' });
            }
            const record = await Endorsement.create({ letter_id, endorsed_to, endorsed_by, notes, dept_id });
            res.status(201).json(record);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // DELETE endorsement
    static async delete(req, res) {
        try {
            const record = await Endorsement.findByPk(req.params.id);
            if (!record) return res.status(404).json({ error: 'Not found' });
            await record.destroy();
            res.json({ message: 'Deleted' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // COUNT (for notification badge)
    static async count(req, res) {
        try {
            const { where, include } = buildQueryOptions(req.query);
            const count = await Endorsement.count({
                where,
                include,
                distinct: true,
                col: 'id'
            });
            res.json({ count });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // NOTIFY via Telegram
    static async notifyTelegram(req, res) {
        try {
            const { endorsement_id } = req.body;
            const endorsement = await Endorsement.findByPk(endorsement_id, {
                include: [{ model: Letter, as: 'letter' }]
            });

            if (!endorsement) return res.status(404).json({ error: 'Endorsement not found' });

            const personName = endorsement.endorsed_to;
            let chatId = req.body.chat_id;

            if (!chatId) {
                // Look up chat ID if not provided
                const userMatch = await User.findOne({
                    where: {
                        [Op.or]: [
                            { username: personName },
                            sequelize.literal(`"last_name" || ', ' || "first_name" = '${personName.replace(/'/g, "''")}'`),
                            sequelize.literal(`"first_name" || ' ' || "last_name" = '${personName.replace(/'/g, "''")}'`)
                        ]
                    }
                });
                if (userMatch) chatId = userMatch.telegram_chat_id;
                
                if (!chatId) {
                    const personMatch = await Person.findOne({ where: { name: personName } });
                    if (personMatch) chatId = personMatch.telegram_chat_id;
                }
            }

            // If it's a bot or we have a chat ID, send notification
            if (personName.toLowerCase().includes('lms bot') || chatId) {
                const text = 
                    `<b>📢 Endorsement Notification</b>\n\n` +
                    `📄 <b>Letter:</b> <code>${endorsement.letter?.lms_id || 'N/A'}</code>\n` +
                    `👤 <b>To:</b> ${personName}\n` +
                    `💬 <b>Notes:</b> ${endorsement.notes || 'No notes'}\n\n` +
                    `Please check your LMS Inbox.`;

                // If it's the bot, we might send to a default group or just log it
                // For now, if chatID represents the destination, send it.
                if (chatId) {
                    await TelegramService.sendMessage(chatId, text);
                }
                
                return res.json({ success: true, message: 'Notification sent' });
            }

            res.status(400).json({ error: 'No Telegram ID found for this person' });
        } catch (error) {
            console.error('notifyTelegram error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = EndorsementController;
