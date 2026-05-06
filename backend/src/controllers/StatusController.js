const { Status, Department } = require('../models/associations');

class StatusController {
    static async getAll(req, res) {
        try {
            const statuses = await Status.findAll();
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
            const { id } = req.params;
            const { Status, Letter, LetterAssignment, LetterLog } = require('../models/associations');
            
            const status = await Status.findByPk(id);
            if (!status) return res.status(404).json({ error: 'Status not found' });

            // Check if status is used in any letters
            const letterCount = await Letter.count({ where: { global_status: id } });
            if (letterCount > 0) {
                return res.status(400).json({ 
                    error: `Cannot delete status because it is currently used by ${letterCount} letter(s).` 
                });
            }

            // Check if used in assignments
            const assignmentCount = await LetterAssignment.count({ where: { status_id: id } });
            if (assignmentCount > 0) {
                return res.status(400).json({ 
                    error: `Cannot delete status because it is linked to ${assignmentCount} active assignment(s).` 
                });
            }

            // Check if used in logs
            const logCount = await LetterLog.count({ where: { status_id: id } });
            if (logCount > 0) {
                return res.status(400).json({ 
                    error: `Cannot delete status because it exists in ${logCount} historical letter logs.` 
                });
            }

            await status.destroy();
            res.json({ message: 'Status deleted successfully' });
        } catch (error) {
            console.error('[STATUS DELETE ERROR]', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = StatusController;
