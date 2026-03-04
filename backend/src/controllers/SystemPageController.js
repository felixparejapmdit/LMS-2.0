const { SystemPage } = require('../models/associations');

class SystemPageController {
    static async getAll(req, res) {
        try {
            const results = await SystemPage.findAll({
                order: [['page_name', 'ASC']]
            });
            res.json(results);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const page = await SystemPage.create(req.body);
            res.json(page);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            await SystemPage.destroy({ where: { id: req.params.id } });
            res.json({ message: 'Page deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = SystemPageController;
