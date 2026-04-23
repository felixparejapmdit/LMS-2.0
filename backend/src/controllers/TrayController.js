const { Tray, Letter, Department, User } = require('../models/associations');
const { Op } = require('sequelize');

class TrayController {
    static async getAll(req, res) {
        try {
            const { user_id, include_letters } = req.query;
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

            const include = [{ model: Department, as: 'department' }];

            if (include_letters === 'true') {
                include.push({ 
                    model: Letter, 
                    as: 'letters', 
                    attributes: ['id', 'lms_id', 'sender', 'summary', 'global_status', 'created_at'] 
                });
            }

            const trays = await Tray.findAll({ where, include });

            res.setHeader('X-API-Version', '2.1.0');
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
