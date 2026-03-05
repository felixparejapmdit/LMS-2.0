const { Letter, LetterKind, LetterAssignment } = require('../models/associations');
const Endorsement = require('../models/Endorsement');
const sequelize = require('../config/db');
const { Op } = require('sequelize');

// CREATE the table if it doesn't exist
(async () => {
    try {
        await Endorsement.sync({ alter: true });
    } catch (e) {
        console.warn('Endorsement sync warning:', e.message);
    }
})();

class EndorsementController {
    // GET all endorsements (with letter info)
    static async getAll(req, res) {
        try {
            const { user_id, department_id, role } = req.query;
            const where = {};
            const letterWhere = {};

            const normalizedRole = role ? role.toString().toUpperCase() : '';

            // Role-based filtering for USER role
            if (normalizedRole === 'USER' && user_id) {
                letterWhere[Op.or] = [
                    { encoder_id: user_id },
                    { '$assignments.department_id$': department_id }
                ];
            }

            const enrichInclude = [
                {
                    model: Letter,
                    as: 'letter',
                    where: Object.keys(letterWhere).length > 0 ? letterWhere : null,
                    attributes: ['id', 'lms_id', 'sender', 'summary', 'encoder_id'],
                    include: [
                        { model: LetterKind, as: 'letterKind', attributes: ['kind_name'] },
                        { model: LetterAssignment, as: 'assignments', attributes: ['department_id'], required: false }
                    ]
                }
            ];

            const endorsements = await Endorsement.findAll({
                where,
                include: enrichInclude,
                order: [['endorsed_at', 'DESC']]
            });

            res.json(endorsements);
        } catch (error) {
            console.error('Endorsement.getAll error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // CREATE endorsement
    static async create(req, res) {
        try {
            const { letter_id, endorsed_to, endorsed_by, notes } = req.body;
            if (!letter_id || !endorsed_to) {
                return res.status(400).json({ error: 'letter_id and endorsed_to are required.' });
            }
            const record = await Endorsement.create({ letter_id, endorsed_to, endorsed_by, notes });
            res.status(201).json(record);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // DELETE endorsement
    static async delete(req, res) {
        try {
            const record = await Endorsement.findByPk(req.params.id);
            if (!record) return res.status(404).json({ error: 'Not found' });
            await record.destroy();
            res.json({ message: 'Deleted' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // COUNT (for notification badge)
    static async count(req, res) {
        try {
            const count = await Endorsement.count();
            res.json({ count });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = EndorsementController;
