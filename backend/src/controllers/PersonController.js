const { Person } = require('../models/associations');
const { Op } = require('sequelize');

class PersonController {
    static async search(req, res) {
        try {
            const { query } = req.query;
            if (!query) return res.json([]);
            const results = await Person.findAll({
                where: {
                    name: { [Op.like]: `%${query}%` }
                },
                limit: 10,
                order: [['name', 'ASC']]
            });
            res.json(results);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getAll(req, res) {
        try {
            const results = await Person.findAll({
                order: [['name', 'ASC']]
            });
            res.json(results);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const result = await Person.create(req.body);
            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const person = await Person.findByPk(id);
            if (!person) return res.status(404).json({ error: 'Person not found' });

            await person.update(req.body);
            res.json(person);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const person = await Person.findByPk(id);
            if (!person) return res.status(404).json({ error: 'Person not found' });

            await person.destroy();
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = PersonController;
