const { User, Department, Role } = require('../models/associations');
const argon2 = require('argon2');

class UserController {
    static async getAll(req, res) {
        try {
            const { username, dept_id } = req.query;
            const where = {};
            if (username) where.username = username;
            if (dept_id) where.dept_id = dept_id;

            const users = await User.findAll({
                where,
                include: [
                    { model: Department, as: 'department' },
                    { model: Role, as: 'roleData' }
                ]
            });
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const user = await User.findByPk(req.params.id, {
                include: [
                    { model: Department, as: 'department' },
                    { model: Role, as: 'roleData' }
                ]
            });
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json(user);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const data = { ...req.body };
            if (data.role) {
                const roleDoc = await Role.findOne({ where: { name: data.role } });
                if (roleDoc) data.role = roleDoc.id;
            }
            if (data.password) {
                data.password = await argon2.hash(data.password, { type: argon2.argon2id });
            }
            const user = await User.create(data);
            res.status(201).json(user);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const user = await User.findByPk(req.params.id);
            if (!user) return res.status(404).json({ error: 'User not found' });

            const data = { ...req.body };
            if (data.role) {
                const roleDoc = await Role.findOne({ where: { name: data.role } });
                if (roleDoc) data.role = roleDoc.id;
            }
            if (data.password) {
                data.password = await argon2.hash(data.password, { type: argon2.argon2id });
            } else {
                delete data.password;
            }

            await user.update(data);
            res.json(user);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const user = await User.findByPk(req.params.id);
            if (!user) return res.status(404).json({ error: 'User not found' });
            await user.destroy();
            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = UserController;
