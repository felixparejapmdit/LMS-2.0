const { Comment, User } = require('../models/associations');

class CommentController {
    static async getByLetter(req, res) {
        try {
            const { letter_id } = req.params;
            const comments = await Comment.findAll({
                where: { letter_id },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['first_name', 'last_name']
                }],
                order: [['created_at', 'DESC']]
            });
            res.json(comments);
        } catch (error) {
            console.error('[CommentController.getByLetter] ERROR:', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const { letter_id, user_id, comment_body } = req.body;
            console.log('[CommentController.create] Incoming payload:', req.body);
            if (!letter_id || !user_id || !comment_body) {
                return res.status(400).json({ error: 'letter_id, user_id, and comment_body are required.' });
            }
            const comment = await Comment.create({
                letter_id,
                user_id,
                comment_body,
                created_at: new Date()
            });
            console.log('[CommentController.create] SUCCESS:', comment.id);
            res.status(201).json(comment);
        } catch (error) {
            console.error('[CommentController.create] ERROR:', error);
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = CommentController;
