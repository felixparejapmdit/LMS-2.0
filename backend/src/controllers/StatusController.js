const { Status, Department } = require('../models/associations');

class StatusController {
    static async getAll(req, res) {
        try {
            const { dept_id } = req.query;
            const where = {};
            
            if (dept_id && dept_id !== 'all') {
                where.dept_id = (dept_id === 'null' || dept_id === 'undefined') ? null : dept_id;
            }
            const statuses = await Status.findAll({ 
                where,
                include: [{ model: Department, as: 'department' }]
            });
            res.json(statuses);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const status = await Status.findByPk(req.params.id);
            if (!status) return res.status(404).json({ error: 'Status not found' });
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const status = await Status.create(req.body);
            res.status(201).json(status);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const status = await Status.findByPk(req.params.id);
            if (!status) return res.status(404).json({ error: 'Status not found' });
            await status.update(req.body);
            res.json(status);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const status = await Status.findByPk(req.params.id);
            if (!status) return res.status(404).json({ error: 'Status not found' });
            await status.destroy();
            res.json({ message: 'Status deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = StatusController;
