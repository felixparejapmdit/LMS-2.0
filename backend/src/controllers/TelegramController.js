const { Letter, Comment, User, Person } = require('../models/associations');
const TelegramService = require('../services/telegramService');

class TelegramController {
    static async handleWebhook(req, res) {
        const update = req.body;
        console.log('Received Telegram Update:', JSON.stringify(update, null, 2));

        try {
            if (update.callback_query) {
                const { data, from } = update.callback_query;
                const [action, letterId] = data.split(':');

                if (action === 'add_comment') {
                    // Use a specific prompt that we can recognize later
                    await TelegramService.sendMessage(
                        from.id,
                        `📝 <b>Adding Comment to Letter #${letterId}</b>\n\nPlease <u>REPLY</u> to this message with your comment.`,
                        { force_reply: true }
                    );
                }
            } else if (update.message) {
                const { text, from, reply_to_message } = update.message;

                // Check if this is a reply to our "Adding Comment" prompt
                if (reply_to_message && reply_to_message.text.includes('Adding Comment to Letter #')) {
                    const letterIdMatch = reply_to_message.text.match(/Letter #(\d+)/);
                    if (letterIdMatch) {
                        const letterId = letterIdMatch[1];
                        const commentBody = text;

                        // 1. Try to find the user in User table directly
                        let user = await User.findOne({ where: { telegram_chat_id: from.id.toString() } });

                        // 2. Fallback to Person table matching (External/Legacy)
                        if (!user) {
                            const person = await Person.findOne({ where: { telegram_chat_id: from.id.toString() } });
                            if (person) {
                                const nameParts = person.name.split(',').map(n => n.trim());
                                user = await User.findOne({
                                    where: {
                                        first_name: nameParts[1],
                                        last_name: nameParts[0]
                                    }
                                });
                            }
                        }

                        if (user) {
                            await Comment.create({
                                letter_id: letterId,
                                user_id: user.id,
                                comment_body: commentBody
                            });
                            await TelegramService.sendMessage(from.id, `✅ Comment successfully added to Letter #${letterId}.`);
                        } else {
                            await TelegramService.sendMessage(from.id, `❌ Your Telegram account isn't linked to an LMS user. Please set your Chat ID in your Profile settings within the LMS.`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Telegram Webhook Error:', error);
        }

        res.sendStatus(200);
    }
}

module.exports = TelegramController;
