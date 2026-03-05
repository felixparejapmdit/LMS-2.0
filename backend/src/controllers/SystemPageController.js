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
            const { page_id, page_name, description } = req.body || {};
            if (!page_id || !page_name) {
                return res.status(400).json({ error: 'page_id and page_name are required' });
            }

            const [page, created] = await SystemPage.findOrCreate({
                where: { page_id },
                defaults: { page_id, page_name, description }
            });

            if (!created) {
                await page.update({
                    page_name: page_name || page.page_name,
                    description: description ?? page.description
                });
            }

            res.json(page);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async sync(req, res) {
        try {
            const pages = Array.isArray(req.body?.pages) ? req.body.pages : [];
            if (pages.length === 0) return res.json([]);

            const results = [];
            for (const entry of pages) {
                const page_id = (entry?.page_id || '').toString().trim();
                const page_name = (entry?.page_name || '').toString().trim();
                if (!page_id || !page_name) continue;

                const [page, created] = await SystemPage.findOrCreate({
                    where: { page_id },
                    defaults: {
                        page_id,
                        page_name,
                        description: entry?.description || null
                    }
                });

                if (!created && (page.page_name !== page_name || (entry?.description ?? null) !== (page.description ?? null))) {
                    await page.update({
                        page_name,
                        description: entry?.description ?? page.description
                    });
                }

                results.push(page);
            }

            res.json(results);
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
