const { LetterKind, Department, User } = require('../models/associations');

class LetterKindController {
    static async getAll(req, res) {
        try {
            const { user_id } = req.query;
            const where = {};
            
            if (user_id) {
                const user = await User.findByPk(user_id);
                if (user) {
                    // Force their assigned department (assigned or null)
                    where.dept_id = user.dept_id || null;
                }
            } else {
                const { dept_id: queryDeptId } = req.query;
                if (queryDeptId && queryDeptId !== 'all') {
                    where.dept_id = (queryDeptId === 'null' || queryDeptId === 'undefined') ? null : queryDeptId;
                }
            }

            const kinds = await LetterKind.findAll({ 
                where,
                include: [{ model: Department, as: 'department' }]
            });
            res.json(kinds);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const kind = await LetterKind.findByPk(req.params.id);
            if (!kind) return res.status(404).json({ error: 'LetterKind not found' });
            res.json(kind);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const kind = await LetterKind.create(req.body);
            res.status(201).json(kind);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const kind = await LetterKind.findByPk(req.params.id);
            if (!kind) return res.status(404).json({ error: 'LetterKind not found' });
            await kind.update(req.body);
            res.json(kind);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const kind = await LetterKind.findByPk(req.params.id);
            if (!kind) return res.status(404).json({ error: 'LetterKind not found' });
            await kind.destroy();
            res.json({ message: 'LetterKind deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = LetterKindController;
