const TelegramController = require('../backend/src/controllers/TelegramController');
const TelegramService = require('../backend/src/services/telegramService');

const original = {
    sendMessage: TelegramService.sendMessage,
    answerCallbackQuery: TelegramService.answerCallbackQuery,
    resolveUserByTelegramId: TelegramController.resolveUserByTelegramId,
    fetchLettersByType: TelegramController.fetchLettersByType
};

const sent = [];

const resetSent = () => {
    sent.length = 0;
};

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const mockVipUser = { id: 'u1', role: 'VIP', roleData: { name: 'VIP' } };
const mockStaffUser = { id: 'u2', role: 'STAFF', roleData: { name: 'Staff' } };

TelegramService.sendMessage = async (...args) => {
    sent.push({ type: 'send', args });
    return { ok: true };
};

TelegramService.answerCallbackQuery = async (...args) => {
    sent.push({ type: 'answer', args });
    return { ok: true };
};

TelegramController.resolveUserByTelegramId = async (id) => {
    if (id === 1) return mockVipUser;
    if (id === 2) return mockStaffUser;
    return null;
};

TelegramController.fetchLettersByType = async (type) => {
    return [
        {
            letter: {
                id: 11,
                lms_id: 'LMS-001',
                sender: 'Sample Sender',
                status: { status_name: 'For Review' },
                summary: 'Sample summary',
                attachment_id: null,
                scanned_copy: null
            },
            step: { step_name: type === 'signature' ? 'For Signature' : 'For Review' }
        }
    ];
};

const run = async () => {
    // /start (VIP)
    resetSent();
    await TelegramController.processUpdate({
        message: {
            text: '/start',
            from: { id: 1, username: 'vip' },
            chat: { id: -1001 },
            entities: [{ type: 'bot_command', offset: 0, length: 6 }]
        }
    });
    assert(sent.length === 1, 'Expected one message for /start');
    assert(sent[0].args[0] === -1001, 'Expected /start reply to chat');
    assert(String(sent[0].args[1]).includes('Commands'), 'Expected /start help text');

    // /show (VIP)
    resetSent();
    await TelegramController.processUpdate({
        message: {
            text: '/show',
            from: { id: 1, username: 'vip' },
            chat: { id: -1001 },
            entities: [{ type: 'bot_command', offset: 0, length: 5 }]
        }
    });
    assert(sent.length === 1, 'Expected one message for /show');
    assert(String(sent[0].args[1]).includes('Choose which letters'), 'Expected /show prompt');

    // /showletters@LMS2_0Bot (VIP)
    resetSent();
    await TelegramController.processUpdate({
        message: {
            text: '/showletters@LMS2_0Bot',
            from: { id: 1, username: 'vip' },
            chat: { id: -1001 },
            entities: [{ type: 'bot_command', offset: 0, length: 22 }]
        }
    });
    assert(sent.length === 1, 'Expected one message for /showletters');
    assert(String(sent[0].args[1]).includes('Choose which letters'), 'Expected /showletters prompt');

    // /show (non-VIP)
    resetSent();
    await TelegramController.processUpdate({
        message: {
            text: '/show',
            from: { id: 2, username: 'staff' },
            chat: { id: -1002 },
            entities: [{ type: 'bot_command', offset: 0, length: 5 }]
        }
    });
    assert(sent.length === 1, 'Expected one message for non-VIP /show');
    assert(String(sent[0].args[1]).includes('Only VIP'), 'Expected VIP-only access denial');

    // callback_query show_letters:signature (VIP)
    resetSent();
    await TelegramController.processUpdate({
        callback_query: {
            id: 'cb-1',
            data: 'show_letters:signature',
            from: { id: 1, username: 'vip' },
            message: { chat: { id: -1001 } }
        }
    });
    const sendCount = sent.filter((entry) => entry.type === 'send').length;
    assert(sendCount >= 2, 'Expected header + letter message for show_letters');

    // callback_query add_comment (non-VIP)
    resetSent();
    await TelegramController.processUpdate({
        callback_query: {
            id: 'cb-2',
            data: 'add_comment:11',
            from: { id: 2, username: 'staff' },
            message: { chat: { id: -1002 } }
        }
    });
    assert(sent.some((entry) => String(entry.args?.[1] || '').includes('Only VIP')), 'Expected VIP-only add_comment denial');

    // callback_query add_comment (VIP)
    resetSent();
    await TelegramController.processUpdate({
        callback_query: {
            id: 'cb-3',
            data: 'add_comment:11',
            from: { id: 1, username: 'vip' },
            message: { chat: { id: -1001 } }
        }
    });
    assert(sent.some((entry) => String(entry.args?.[1] || '').includes('Adding Comment')), 'Expected add_comment prompt for VIP');

    console.log('Telegram bot command tests passed.');
};

run()
    .then(() => {
        TelegramService.sendMessage = original.sendMessage;
        TelegramService.answerCallbackQuery = original.answerCallbackQuery;
        TelegramController.resolveUserByTelegramId = original.resolveUserByTelegramId;
        TelegramController.fetchLettersByType = original.fetchLettersByType;
    })
    .catch((err) => {
        TelegramService.sendMessage = original.sendMessage;
        TelegramService.answerCallbackQuery = original.answerCallbackQuery;
        TelegramController.resolveUserByTelegramId = original.resolveUserByTelegramId;
        TelegramController.fetchLettersByType = original.fetchLettersByType;
        console.error('Telegram bot command tests failed:', err.message);
        process.exit(1);
    });
