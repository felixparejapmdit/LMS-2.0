const { Person } = require('../models/associations');
const { Op } = require('sequelize');

class PersonController {
    static async search(req, res) {
        try {
            const { query } = req.query;
            const normalizedQuery = (query || "").toString().trim();
            if (!normalizedQuery) return res.json([]);
            const queryHasComma = normalizedQuery.includes(",");
            const queryPattern = queryHasComma
                ? `${normalizedQuery}%`
                : `%${normalizedQuery}%`;
            const results = await Person.findAll({
                where: {
                    name: { [Op.like]: queryPattern }
                },
                limit: 50,
                order: [['name', 'ASC']]
            });
            const lowerQuery = normalizedQuery.toLowerCase();
            const ranked = results
                .map((person) => ({
                    ...person.toJSON(),
                    name: (person.name || "").toString().replace(/,+$/, "").trim(),
                }))
                .filter((person) => person.name)
                .sort((left, right) => {
                    const leftName = left.name.toLowerCase();
                    const rightName = right.name.toLowerCase();
                    const leftRank = leftName === lowerQuery ? 0 : leftName.startsWith(lowerQuery) ? 1 : 2;
                    const rightRank = rightName === lowerQuery ? 0 : rightName.startsWith(lowerQuery) ? 1 : 2;
                    if (leftRank !== rightRank) return leftRank - rightRank;
                    return left.name.localeCompare(right.name);
                })
                .slice(0, 10);
            res.json(ranked);
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
