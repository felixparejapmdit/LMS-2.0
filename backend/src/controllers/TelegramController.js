const { Letter, Comment, User, Person, Role, LetterLog, LetterAssignment, ProcessStep, Status } = require('../models/associations');
const { Op } = require('sequelize');
const TelegramService = require('../services/telegramService');
const path = require('path');

const ICONS = {
    cross: '❌',
    note: '📝',
    warning: '⚠️',
    page: '📄',
    person: '👤',
    flag: '🚩',
    arrow: '➡️',
    comment: '💬',
    folder: '🗂️',
    search: '🔍',
    mail: '📧',
    box: '📦',
    green: '🟢',
    orange: '🟠',
    blue: '🔵',
    check: '✅'
};

class TelegramController {
    static escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;');
    }
    static getPublicBaseUrl() {
        let webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || '';
        if (!webhookUrl) return null;
        
        // Ensure protocol exists for URL constructor
        if (!webhookUrl.startsWith('http')) {
            webhookUrl = 'https://' + webhookUrl;
        }

        try {
            return new URL(webhookUrl).origin;
        } catch (error) {
            console.error('Telegram BOT: Invalid TELEGRAM_WEBHOOK_URL format:', webhookUrl);
            return null;
        }
    }

    static getLetterPdfUrl(letter) {
        const baseUrl = TelegramController.getPublicBaseUrl();
        if (!baseUrl || !letter) return null;

        if (letter.attachment_id) {
            const firstId = String(letter.attachment_id).split(',')[0].trim();
            if (firstId) return `${baseUrl}/api/attachments/view/${firstId}`;
        }

        if (letter.scanned_copy) {
            const fileName = path.basename(letter.scanned_copy);
            if (fileName) return `${baseUrl}/uploads/${encodeURIComponent(fileName)}`;
        }

        return null;
    }

    static async resolveUserByTelegramId(telegramId) {
        const chatId = telegramId.toString();
        let user = await User.findOne({
            where: { telegram_chat_id: chatId },
            include: [{ model: Role, as: 'roleData', attributes: ['name'] }]
        });

        if (!user) {
            const person = await Person.findOne({ where: { telegram_chat_id: chatId } });
            if (person) {
                const nameParts = person.name.split(',').map(n => n.trim());
                user = await User.findOne({
                    where: {
                        first_name: nameParts[1],
                        last_name: nameParts[0]
                    },
                    include: [{ model: Role, as: 'roleData', attributes: ['name'] }]
                });
            }
        }

        return user;
    }

    static async fetchLettersByType(type) {
        const atgStatus = await Status.findOne({ where: { status_name: 'ATG Note' } });
        const atgStatusId = atgStatus?.id || null;
        const atgFilter = atgStatusId
            ? {
                [Op.or]: [
                    { '$letter.global_status$': atgStatusId },
                    { '$letter.status.status_name$': 'ATG Note' }
                ]
            }
            : { '$letter.status.status_name$': 'ATG Note' };

        const includeStatus = {
            model: Status,
            as: 'status',
            attributes: ['status_name'],
            required: type !== 'vem'
        };
        const includeLetter = {
            model: Letter,
            as: 'letter',
            required: true,
            include: [
                includeStatus,
                { model: Comment, as: 'comments', attributes: ['id'] }
            ]
        };
        const includeStep = {
            model: ProcessStep,
            as: 'step',
            required: type !== 'vem'
        };

        const where = {};
        const atgClauses = [
            { '$letter.tray_id$': { [Op.or]: [null, 0] } },
            atgFilter
        ];
        if (type === 'review' || type === 'signature') {
            const stepId = type === 'review' ? 2 : 1;
            const step = await ProcessStep.findByPk(stepId);
            const stepName = step?.step_name || (type === 'review' ? 'For Review' : 'For Signature');
            where[Op.and] = [
                { '$letter.status.status_name$': { [Op.notIn]: ['Filed', 'Done'] } },
                { '$step.step_name$': stepName },
                ...atgClauses
            ];
        } else if (type === 'vem') {
            where[Op.and] = [
                ...atgClauses,
                {
                    [Op.or]: [
                        { '$step.step_name$': { [Op.like]: '%VEM%' } },
                        { '$letter.vemcode$': { [Op.and]: [{ [Op.ne]: '' }, { [Op.not]: null }] } }
                    ]
                }
            ];
        }

        const assignments = await LetterAssignment.findAll({
            where,
            include: [includeLetter, includeStep],
            order: [['created_at', 'DESC']],
            subQuery: false
        });

        const unique = new Map();
        for (const assignment of assignments) {
            if (assignment.letter && !unique.has(assignment.letter.id)) {
                unique.set(assignment.letter.id, assignment);
            }
        }

        return Array.from(unique.values());
    }

    static async processUpdate(update) {
        console.log('Received Telegram Update:', JSON.stringify(update, null, 2));

        try {
            if (update.callback_query) {
                const { data, from, id: callbackId, message } = update.callback_query;
                const chatId = message?.chat?.id ?? from?.id;
                if (!data) {
                    await TelegramService.answerCallbackQuery(callbackId);
                    return;
                }
                const [action, actionValue] = data.split(':');

                if (action === 'add_comment') {
                    await TelegramService.answerCallbackQuery(callbackId);
                    const vipUser = await TelegramController.resolveUserByTelegramId(from.id);
                    if (!vipUser) {
                        if (chatId) {
                            await TelegramService.sendMessage(chatId, `${ICONS.cross} Your Telegram account isn't linked to an LMS user. Please set your Chat ID in your Profile settings within the LMS.`);
                        }
                        return;
                    }
                    if (!TelegramService.isVipOnly(vipUser)) {
                        console.warn(`[TELEGRAM] Access Denied for add_comment: ${from.id} (${from.username})`);
                        if (chatId) {
                            await TelegramService.sendMessage(chatId, `${ICONS.cross} Access Denied. Only VIP users can add comments via Telegram.`);
                        }
                        return;
                    }

                    if (chatId) {
                        await TelegramService.sendMessage(
                            chatId,
                            `${ICONS.note} <b>Adding Comment to Letter #${actionValue}</b>\n\nPlease <u>REPLY</u> to this message with your comment.`,
                            { force_reply: true }
                        );
                    }
                } else if (action === 'show_letters') {
                    await TelegramService.answerCallbackQuery(callbackId);
                    const vipUser = await TelegramController.resolveUserByTelegramId(from.id);
                    if (!vipUser) {
                        if (chatId) {
                            await TelegramService.sendMessage(chatId, `${ICONS.cross} Your Telegram account isn't linked to an LMS user. Please set your Chat ID in your Profile settings within the LMS.`);
                        }
                        return;
                    }
                    if (!TelegramService.isVipOnly(vipUser)) {
                        console.warn(`[TELEGRAM] Access Denied for show_letters: ${from.id} (${from.username})`);
                        if (chatId) {
                            await TelegramService.sendMessage(chatId, `${ICONS.cross} Access Denied. Only VIP users can view letters in the bot.`);
                        }
                        return;
                    }
                    const allowComment = TelegramService.isVipOnly(vipUser);

                    const type = actionValue;
                    const titleMap = {
                        signature: 'For Signature',
                        review: 'For Review',
                        vem: 'VEM Letter'
                    };
                    const title = titleMap[type] || 'Letters';
                    const assignments = await TelegramController.fetchLettersByType(type);

                    if (!assignments.length) {
                        if (chatId) {
                            await TelegramService.sendMessage(chatId, `${ICONS.warning} No letters found for ${title}.`);
                        }
                        return;
                    }

                    const maxItems = 20;
                    const limited = assignments.slice(0, maxItems);
                    let header = `${ICONS.page} <b>${title}</b>\nFound ${assignments.length} letter(s).`;
                    if (assignments.length > maxItems) {
                        header += ` Showing first ${maxItems}.`;
                    }
                    if (chatId) {
                        await TelegramService.sendMessage(chatId, header);
                    }

                    for (const assignment of limited) {
                        try {
                            const letter = assignment.letter;
                            if (!letter) continue;
                            const stepName = TelegramController.escapeHtml(assignment.step?.step_name || 'N/A');
                            const statusName = TelegramController.escapeHtml(letter.status?.status_name || 'N/A');
                            const summaryRaw = (letter.summary || '').trim();
                            const summaryTrimmed = summaryRaw.length > 120 ? `${summaryRaw.slice(0, 120)}...` : summaryRaw;
                            const summary = TelegramController.escapeHtml(summaryTrimmed);

                            const pdfUrl = TelegramController.getLetterPdfUrl(letter);
                            const safeLms = TelegramController.escapeHtml(letter.lms_id);
                            const lmsLabel = pdfUrl
                                ? `<a href="${pdfUrl}">${ICONS.page} ${safeLms}</a>`
                                : `${ICONS.page} <b>${safeLms}</b>`;

                            let text = `${lmsLabel}\n`;
                            text += `${ICONS.person} Sender: ${TelegramController.escapeHtml(letter.sender)}\n`;
                            text += `${ICONS.flag} Status: ${statusName}\n`;
                            text += `${ICONS.arrow} Step: ${stepName}`;
                            if (summary) {
                                text += `\n${ICONS.note} Summary: ${summary}`;
                            }

                            const replyMarkup = {
                                inline_keyboard: [
                                    [
                                        { text: `${ICONS.folder} View Comments`, callback_data: `show_comments:${letter.id}` }
                                    ],
                                    [
                                        { text: `${ICONS.search} Track Progress`, callback_data: `track_progress:${letter.id}` }
                                    ]
                                ]
                            };
                            if (allowComment) {
                                replyMarkup.inline_keyboard[0].unshift({ text: `${ICONS.comment} Add Comment`, callback_data: `add_comment:${letter.id}` });
                            }
                            if (chatId) {
                                await TelegramService.sendMessage(chatId, text, replyMarkup, { disable_web_page_preview: true });
                            }
                        } catch (sendError) {
                            console.error('Telegram show_letters send error:', sendError);
                        }
                    }
                } else if (action === 'show_comments') {
                    await TelegramService.answerCallbackQuery(callbackId);
                    const vipUser = await TelegramController.resolveUserByTelegramId(from.id);
                    if (!vipUser) {
                        if (chatId) {
                            await TelegramService.sendMessage(chatId, `${ICONS.cross} Your Telegram account isn't linked to an LMS user. Please set your Chat ID in your Profile settings within the LMS.`);
                        }
                        return;
                    }
                    if (!TelegramService.isVipOnly(vipUser)) {
                        console.warn(`[TELEGRAM] Access Denied for show_comments: ${from.id} (${from.username})`);
                        if (chatId) {
                            await TelegramService.sendMessage(chatId, `${ICONS.cross} Access Denied. Only VIP users can view comments in the bot.`);
                        }
                        return;
                    }

                    const letterId = actionValue;
                    const comments = await Comment.findAll({
                        where: { letter_id: letterId },
                        include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
                        order: [['created_at', 'DESC']],
                        limit: 10
                    });

                    if (!comments.length) {
                        if (chatId) {
                            await TelegramService.sendMessage(chatId, `${ICONS.warning} No comments yet for Letter #${letterId}.`);
                        }
                        return;
                    }

                    const lines = comments.map((comment) => {
                        const author = comment.user ? `${comment.user.last_name}, ${comment.user.first_name}` : 'Unknown';
                        const safeAuthor = TelegramController.escapeHtml(author);
                        const date = comment.created_at ? new Date(comment.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '';
                        const safeBody = TelegramController.escapeHtml(comment.comment_body);
                        return `• <b>${safeAuthor}</b> (${date})\n${safeBody}`;
                    });

                    const body = lines.join('\n\n');
                    if (chatId) {
                        await TelegramService.sendMessage(chatId, `${ICONS.mail} <b>Comments for Letter #${letterId}</b>\n\n${body}`);
                    }
                } else if (action === 'ack') {
                    await TelegramService.answerCallbackQuery(callbackId, 'Received. Thank you!', false);
                    const user = await TelegramController.resolveUserByTelegramId(from.id);
                    try {
                        await LetterLog.create({
                            letter_id: actionValue,
                            user_id: user?.id || null,
                            action_type: 'Acknowledged',
                            log_details: user ? 'Telegram notification acknowledged.' : 'Telegram notification acknowledged (unlinked user).',
                            metadata: user
                                ? null
                                : {
                                    telegram_chat_id: from.id,
                                    telegram_username: from.username || null,
                                    telegram_first_name: from.first_name || null,
                                    telegram_last_name: from.last_name || null
                                }
                        });
                    } catch (logError) {
                        console.error('Telegram ack log error:', logError);
                    }
                } else if (action === 'track_progress') {
                    await TelegramService.answerCallbackQuery(callbackId);
                    const letter = await Letter.findByPk(actionValue, {
                        include: [
                            'status',
                            { model: LetterLog, as: 'logs', include: ['user'] },
                            { model: User, as: 'encoder', attributes: ['id', 'first_name', 'last_name'] }
                        ]
                    });

                    if (!letter) {
                        if (chatId) {
                            return await TelegramService.sendMessage(chatId, `${ICONS.cross} Letter not found.`);
                        }
                        return;
                    }

                    const safeLms = TelegramController.escapeHtml(letter.lms_id);
                    let trackingText = `${ICONS.box} <b>Track: ${safeLms}</b>\n\n`;

                    const entryDate = new Date(letter.date_received).toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                    trackingText += `<b>[START]</b> 🟢 <b>Registered</b>\n`;
                    trackingText += `User: ${TelegramController.escapeHtml(letter.encoder ? `${letter.encoder.last_name}, ${letter.encoder.first_name}` : 'Guest')}\n`;
                    trackingText += `Date: ${entryDate}\n\n`;

                    if (letter.logs && letter.logs.length > 0) {
                        letter.logs.forEach((log) => {
                            const isEndorsement = log.action_type === 'Endorsed';
                            const logDate = new Date(log.timestamp || log.log_date).toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

                            trackingText += `<b>[UPDATE]</b> ${isEndorsement ? '🟠' : '🔵'} <b>${log.action_type}</b>\n`;
                            trackingText += `Info: ${TelegramController.escapeHtml(log.log_details || log.action_taken)}\n`;
                            if (log.user) {
                                trackingText += `By: ${TelegramController.escapeHtml(`${log.user.last_name}, ${log.user.first_name}`)}\n`;
                            }
                            trackingText += `Date: ${logDate}\n\n`;
                        });
                    }

                    trackingText += `--------------------\n`;
                    trackingText += `${ICONS.flag} <b>Status:</b> ${TelegramController.escapeHtml(letter.status?.status_name || 'PROCESSING')}`;

                    if (chatId) {
                        await TelegramService.sendMessage(chatId, trackingText);
                    }
                } else {
                    await TelegramService.answerCallbackQuery(callbackId);
                }
            } else {
                const message = update.message || update.edited_message || update.channel_post || update.edited_channel_post;
                if (!message) return;
                const { text, from, reply_to_message } = message;
                const chatId = message.chat?.id ?? from?.id;
                if (!from?.id) return;

                if (reply_to_message && reply_to_message.text && reply_to_message.text.includes('Adding Comment to Letter #')) {
                    const letterIdMatch = reply_to_message.text.match(/Letter #(\d+)/);
                    if (letterIdMatch) {
                        const letterId = letterIdMatch[1];
                        const commentBody = text;

                        const user = await TelegramController.resolveUserByTelegramId(from.id);

                        if (user) {
                            if (!TelegramService.isVipOnly(user)) {
                                console.warn(`[TELEGRAM] Access Denied for reply comment: ${from.id} (${from.username})`);
                                if (chatId) {
                                    await TelegramService.sendMessage(chatId, `${ICONS.cross} Access Denied. Only VIP users can add comments via Telegram.`);
                                }
                                return;
                            }
                            await Comment.create({
                                letter_id: letterId,
                                user_id: user.id,
                                comment_body: commentBody
                            });
                            if (chatId) {
                                await TelegramService.sendMessage(chatId, `${ICONS.check} Comment successfully added to Letter #${letterId}.`);
                            }
                        } else {
                            if (chatId) {
                                await TelegramService.sendMessage(chatId, `${ICONS.cross} Your Telegram account isn't linked to an LMS user. Please set your Chat ID in your Profile settings within the LMS.`);
                            }
                        }
                    }
                } else if (text || message?.caption) {
                    const parsed = TelegramController.extractCommand(message);
                    if (!parsed) return;
                    const { command, argsText } = parsed;
                    const argsLower = argsText.toLowerCase();

                    // Handle /start or /help
                    if (command === '/start' || command === '/help') {
                        let msg = `${ICONS.mail} <b>LMS 2.0 Management Bot</b>\n\n`;
                        msg += `This bot allows you to track letters and add comments directly from Telegram.\n\n`;
                        msg += `Your Telegram Chat ID: <code>${from.id}</code>\n\n`;
                        msg += `<i>Use this ID in your LMS Profile to receive notifications.</i>\n\n`;
                        msg += `<b>Commands:</b>\n`;
                        msg += `/show - View pending letters (VIP only)\n`;
                        msg += `/showletters - View pending letters (VIP only)`;

                        if (chatId) {
                            await TelegramService.sendMessage(chatId, msg);
                        }
                        return;
                    }

                    const isShowLetters = command === '/showletters' || command === '/show';

                    if (isShowLetters) {
                        const vipUser = await TelegramController.resolveUserByTelegramId(from.id);
                        if (!vipUser) {
                            if (chatId) {
                                await TelegramService.sendMessage(chatId, `${ICONS.cross} Your Telegram account isn't linked to an LMS user. Please set your Chat ID in your Profile settings within the LMS.`);
                            }
                            return;
                        }
                        if (!TelegramService.isVipOnly(vipUser)) {
                            console.warn(`[TELEGRAM] Access Denied for /show letters: ${from.id} (${from.username})`);
                            if (chatId) {
                                await TelegramService.sendMessage(chatId, `${ICONS.cross} Access Denied. Only VIP users can use /show letters.`);
                            }
                            return;
                        }

                        const replyMarkup = {
                            inline_keyboard: [
                                [{ text: 'For Signature', callback_data: 'show_letters:signature' }],
                                [{ text: 'For Review', callback_data: 'show_letters:review' }],
                                [{ text: 'VEM Letter', callback_data: 'show_letters:vem' }]
                            ]
                        };
                        if (chatId) {
                            await TelegramService.sendMessage(chatId, `Choose which letters to view:`, replyMarkup);
                        }
                    } else if (command && command.startsWith('/')) {
                        // Unknown command
                        if (chatId) {
                            await TelegramService.sendMessage(chatId, `${ICONS.warning} Unknown command. Try /help`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Telegram Webhook Error:', error);
        }
    }

    static async handleWebhook(req, res) {
        console.log('[BOT-DEBUG] Webhook Body Size:', JSON.stringify(req.body).length);
        const update = req.body;
        res.sendStatus(200);
        TelegramController.processUpdate(update).catch((error) => {
            console.error('[BOT-DEBUG] Process Error:', error);
        });
    }

    static async ping(req, res) {
        res.json({
            ok: true,
            service: 'telegram-webhook',
            timestamp: new Date().toISOString()
        });
    }

    static extractCommand(message) {
        if (!message) return null;
        const text = message.text || message.caption || '';
        const entities = message.entities || message.caption_entities || [];
        const botCommand = entities.find((entity) => entity.type === 'bot_command' && entity.offset === 0);

        if (botCommand && text) {
            const rawCommand = text.slice(botCommand.offset, botCommand.offset + botCommand.length);
            const command = rawCommand.split('@')[0].toLowerCase();
            const argsText = text.slice(botCommand.length).trim();
            return { rawCommand, command, argsText, text };
        }

        if (!text) return null;
        const trimmed = text.trim();
        const token = trimmed.split(/\s+/)[0];
        if (!token.startsWith('/')) return null;
        return {
            rawCommand: token,
            command: token.split('@')[0].toLowerCase(),
            argsText: trimmed.slice(token.length).trim(),
            text: trimmed
        };
    }
}

module.exports = TelegramController;
