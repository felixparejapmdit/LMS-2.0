const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

class TelegramService {
    /**
     * Sends a message to a specific chat ID
     */
    static async sendMessage(chatId, text, replyMarkup = null) {
        if (!BOT_TOKEN || !chatId) return null;

        try {
            const payload = {
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            };
            if (replyMarkup) {
                payload.reply_markup = replyMarkup;
            }
            const response = await axios.post(`${BASE_URL}/sendMessage`, payload);
            return response.data;
        } catch (error) {
            console.error('Error sending Telegram message:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Formats notification for letter movements
     */
    static async notifyMovement(letter, deptName, stepName) {
        const text = `📢 <b>LMS 2.0 Notification</b>
📄 Letter: <code>${letter.lms_id}</code>
👤 Sender: ${letter.sender}
🚀 New Status: ${stepName}
📍 Department: ${deptName}`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '💬 Add Comment', callback_data: `add_comment:${letter.id}` },
                    { text: '🔍 Track Progress', url: `https://test-lms.pmdmc.net/letter-tracker/${letter.id}` }
                ]
            ]
        };

        return { text, replyMarkup };
    }

    /**
     * Gets chat IDs for a list of users or roles
     */
    static async getChatIdsForUsers(users, Person, UserModel) {
        const { Op } = require('sequelize');
        const chatIds = [];

        for (const userInstance of users) {
            // 1. Try finding in the User table directly (Staff/VIPs)
            if (userInstance.telegram_chat_id) {
                chatIds.push(userInstance.telegram_chat_id);
                continue;
            }

            // 2. Try finding by matching Name in Person table (External/Legacy)
            const fullName = `${userInstance.last_name}, ${userInstance.first_name}`;
            const person = await Person.findOne({
                where: {
                    name: { [Op.like]: `%${fullName}%` }
                }
            });

            if (person && person.telegram_chat_id) {
                chatIds.push(person.telegram_chat_id);
            }
        }
        return [...new Set(chatIds)];
    }
}

module.exports = TelegramService;
