const { Department, User } = require('../models/associations');

class DepartmentController {
    static async getAll(req, res) {
        try {
            const depts = await Department.findAll({
                include: [{ model: User, as: 'members' }]
            });
            res.json(depts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const dept = await Department.findByPk(req.params.id);
            if (!dept) return res.status(404).json({ error: 'Department not found' });
            res.json(dept);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const data = { ...req.body };
            // Sanitize dept_code: empty strings should be null to avoid unique constraint issues
            if (data.dept_code === "") data.dept_code = null;

            console.log('Creating Department with body:', data);
            const dept = await Department.create(data);
            res.status(201).json(dept);
        } catch (error) {
            console.error('Department Creation Error:', error);
            res.status(400).json({ error: error.message, details: error.errors?.map(e => e.message) });
        }
    }

    static async update(req, res) {
        try {
            const dept = await Department.findByPk(req.params.id);
            if (!dept) return res.status(404).json({ error: 'Department not found' });
            await dept.update(req.body);
            res.json(dept);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const dept = await Department.findByPk(req.params.id);
            if (!dept) return res.status(404).json({ error: 'Department not found' });
            await dept.destroy();
            res.json({ message: 'Department deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = DepartmentController;
