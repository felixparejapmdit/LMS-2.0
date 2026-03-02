const { LetterKind } = require('../models/associations');

class LetterKindController {
    static async getAll(req, res) {
        try {
            const kinds = await LetterKind.findAll();
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
