const { Tray, Letter, Department } = require('../models/associations');
const { Op } = require('sequelize');

class TrayController {
    static async getAll(req, res) {
        try {
            const { dept_id, include_letters } = req.query;
            const where = {};
            
            if (dept_id && dept_id !== 'all') {
                if (dept_id === 'null' || dept_id === 'undefined') {
                    where.dept_id = null;
                } else {
                    where[Op.or] = [
                        { dept_id: dept_id },
                        { dept_id: null }
                    ];
                }
            }

            const include = [
                { model: Department, as: 'department' }
            ];

            // Only join letters if explicitly requested (it's very heavy)
            if (include_letters === 'true') {
                include.push({ model: Letter, as: 'letters', attributes: ['id'] });
            }

            const trays = await Tray.findAll({
                where,
                include
            });
            res.json(trays);
        } catch (error) {
            console.error("[ERROR] TrayController.getAll:", error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const tray = await Tray.findByPk(req.params.id);
            if (!tray) return res.status(404).json({ error: 'Tray not found' });
            res.json(tray);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const tray = await Tray.create(req.body);
            res.status(201).json(tray);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const tray = await Tray.findByPk(req.params.id);
            if (!tray) return res.status(404).json({ error: 'Tray not found' });
            await tray.update(req.body);
            res.json(tray);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const tray = await Tray.findByPk(req.params.id);
            if (!tray) return res.status(404).json({ error: 'Tray not found' });
            await tray.destroy();
            res.json({ message: 'Tray deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = TrayController;
