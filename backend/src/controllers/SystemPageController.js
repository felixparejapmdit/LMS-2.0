const { SystemPage } = require('../models/associations');

const SQLITE_BUSY_RETRIES = 6;
const SQLITE_BUSY_BASE_DELAY_MS = 150;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isSqliteBusyError = (error) => String(error?.message || '').includes('SQLITE_BUSY');

const withSqliteBusyRetry = async (fn) => {
    let lastError = null;
    for (let attempt = 0; attempt <= SQLITE_BUSY_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (!isSqliteBusyError(error) || attempt === SQLITE_BUSY_RETRIES) {
                throw error;
            }
            const delay = SQLITE_BUSY_BASE_DELAY_MS * (attempt + 1);
            await sleep(delay);
        }
    }
    throw lastError;
};

const normalizePages = (pages = []) => {
    const deduped = new Map();
    pages.forEach((entry) => {
        const page_id = (entry?.page_id || '').toString().trim();
        const page_name = (entry?.page_name || '').toString().trim();
        if (!page_id || !page_name) return;
        deduped.set(page_id, {
            page_id,
            page_name,
            description: entry?.description ?? null
        });
    });
    return [...deduped.values()];
};

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

            const [page, created] = await withSqliteBusyRetry(() => SystemPage.findOrCreate({
                where: { page_id },
                defaults: { page_id, page_name, description }
            }));

            if (!created) {
                const nextName = page_name || page.page_name;
                const nextDescription = description ?? page.description;
                if (page.page_name !== nextName || (page.description ?? null) !== (nextDescription ?? null)) {
                    await withSqliteBusyRetry(() => page.update({
                        page_name: nextName,
                        description: nextDescription
                    }));
                }
            }

            res.json(page);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async sync(req, res) {
        try {
            const pages = normalizePages(Array.isArray(req.body?.pages) ? req.body.pages : []);
            if (pages.length === 0) return res.json([]);

            const existingPages = await withSqliteBusyRetry(() => SystemPage.findAll({
                where: { page_id: pages.map((p) => p.page_id) }
            }));
            const existingById = new Map(existingPages.map((page) => [page.page_id, page]));

            const results = [];
            for (const entry of pages) {
                const existing = existingById.get(entry.page_id);

                if (!existing) {
                    const createdPage = await withSqliteBusyRetry(() => SystemPage.create({
                        page_id: entry.page_id,
                        page_name: entry.page_name,
                        description: entry.description
                    }));
                    existingById.set(entry.page_id, createdPage);
                    results.push(createdPage);
                    continue;
                }

                const nextDescription = entry.description ?? existing.description;
                if (existing.page_name !== entry.page_name || (existing.description ?? null) !== (nextDescription ?? null)) {
                    await withSqliteBusyRetry(() => existing.update({
                        page_name: entry.page_name,
                        description: nextDescription
                    }));
                }

                results.push(existing);
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
