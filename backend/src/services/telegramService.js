const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

const ICONS = {
    bell: '📢',
    page: '📄',
    person: '👤',
    rocket: '🚀',
    pin: '📍',
    comment: '💬',
    track: '🔍',
    check: '✅'
};

class TelegramService {
    static escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;');
    }
    static parseSenderNames(senderField) {
        if (!senderField) return [];
        return senderField
            .split(';')
            .map((name) => name.trim())
            .filter((name) => name.length > 0);
    }
    /**
     * Sends a message to a specific chat ID
     */
    static async sendMessage(chatId, text, replyMarkup = null, extra = {}) {
        if (!BOT_TOKEN || !chatId) return null;

        try {
            const payload = {
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML',
                ...extra
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

    static async answerCallbackQuery(callbackQueryId, text = null, showAlert = false) {
        if (!BOT_TOKEN || !callbackQueryId) return null;
        try {
            const payload = {
                callback_query_id: callbackQueryId,
                show_alert: showAlert
            };
            if (text) payload.text = text;
            const response = await axios.post(`${BASE_URL}/answerCallbackQuery`, payload);
            return response.data;
        } catch (error) {
            console.error('Error answering Telegram callback:', error.response?.data || error.message);
            return null;
        }
    }

    static buildMovementText(letter, deptName, stepName) {
        const safeLms = TelegramService.escapeHtml(letter.lms_id);
        const safeSender = TelegramService.escapeHtml(letter.sender);
        const safeStep = TelegramService.escapeHtml(stepName);
        const safeDept = TelegramService.escapeHtml(deptName);
        return `${ICONS.bell} <b>LMS 2.0 Notification</b>\n` +
            `${ICONS.page} Letter: <code>${safeLms}</code>\n` +
            `${ICONS.person} Sender: ${safeSender}\n` +
            `${ICONS.rocket} New Status: ${safeStep}\n` +
            `${ICONS.pin} Department: ${safeDept}`;
    }

    static buildMovementReplyMarkup(letterId, options = {}) {
        const allowComment = options.allowComment === true;
        const allowAcknowledge = options.allowAcknowledge === true;
        const row = [];
        if (allowComment) {
            row.push({ text: `${ICONS.comment} Add Comment`, callback_data: `add_comment:${letterId}` });
        }
        row.push({ text: `${ICONS.track} Track Progress`, callback_data: `track_progress:${letterId}` });

        const inlineKeyboard = [row];
        if (allowAcknowledge) {
            inlineKeyboard.push([{ text: `${ICONS.check} Received`, callback_data: `ack:${letterId}` }]);
        }

        return { inline_keyboard: inlineKeyboard };
    }

    static isVipRole(userInstance) {
        const roleName = (userInstance?.roleData?.name || userInstance?.role || '').toString().toUpperCase();
        return roleName === 'VIP';
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

    /**
     * Gets chat IDs for sender names stored in the Person table
     */
    static async getChatIdsForSenders(senderField, Person) {
        const { Op } = require('sequelize');
        const chatIds = [];
        const senderNames = TelegramService.parseSenderNames(senderField);

        for (const name of senderNames) {
            let person = await Person.findOne({ where: { name } });
            if (!person) {
                person = await Person.findOne({
                    where: {
                        name: { [Op.like]: `%${name}%` }
                    }
                });
            }

            if (person && person.telegram_chat_id) {
                chatIds.push(person.telegram_chat_id);
            }
        }

        return [...new Set(chatIds)];
    }
}

module.exports = TelegramService;
