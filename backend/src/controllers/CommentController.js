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
            const { letter_id, user_id, comment_body, dept_id } = req.body;
            console.log('[CommentController.create] Incoming payload:', req.body);
            if (!letter_id || !user_id || !comment_body) {
                return res.status(400).json({ error: 'letter_id, user_id, and comment_body are required.' });
            }
            const comment = await Comment.create({
                letter_id,
                user_id,
                comment_body,
                dept_id: dept_id || null,
                created_at: new Date()
            });
            console.log('[CommentController.create] SUCCESS:', comment.id);
            res.status(201).json(comment);
        } catch (error) {
            console.error('[CommentController.create] ERROR:', error);
            res.status(400).json({ error: error.message });
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const { comment_body } = req.body;
            const comment = await Comment.findByPk(id);
            if (!comment) {
                return res.status(404).json({ error: 'Comment not found' });
            }
            comment.comment_body = comment_body;
            await comment.save();
            res.json(comment);
        } catch (error) {
            console.error('[CommentController.update] ERROR:', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const comment = await Comment.findByPk(id);
            if (!comment) {
                return res.status(404).json({ error: 'Comment not found' });
            }
            await comment.destroy();
            res.json({ message: 'Comment deleted successfully' });
        } catch (error) {
            console.error('[CommentController.delete] ERROR:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = CommentController;
