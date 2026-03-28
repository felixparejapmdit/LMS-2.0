const { Letter, LetterKind, LetterAssignment } = require('../models/associations');
const Endorsement = require('../models/Endorsement');
const { Op } = require('sequelize');
const ALL_LETTER_ROLES = new Set([
    'ADMIN',
    'ADMINISTRATOR',
    'SUPERUSER',
    'SUPER USER',
    'SYSTEM ADMIN',
    'SYSTEMADMIN',
    'SUPER ADMIN',
    'SUPERADMIN'
]);

// CREATE the table if it doesn't exist
(async () => {
    try {
        await Endorsement.sync();
    } catch (e) {
        console.warn('Endorsement sync warning:', e.message);
    }
})();

const buildQueryOptions = (query = {}) => {
    const { user_id, department_id, role, mine, full_name } = query;
    const where = {};
    const letterWhere = {};

    const normalizedRole = role ? role.toString().toUpperCase().trim() : '';
    const isAdmin = ALL_LETTER_ROLES.has(normalizedRole); // Note: UUID will fail here as before
    const isUser = normalizedRole === 'USER';
    const mineOnly = `${mine}`.toLowerCase() === 'true';
    const normalizedFullName = (full_name || '').trim();

    if (mineOnly || isUser) {
        where.endorsed_to = { [Op.like]: normalizedFullName || '__NO_MATCH__' };
    }

    // SCOPING: If not an admin and not strictly "mine only", apply visibility filters
    if (!isAdmin && !isUser && !mineOnly) {
        if (user_id) {
            const visibilityOr = [{ encoder_id: user_id }];
            // Use letter's own dept_id if available as a fast path
            if (department_id && department_id !== 'all' && department_id !== 'null' && department_id !== '') {
                visibilityOr.push({ dept_id: department_id });
                // Also check assignments if we must, but keep it as part of the OR
                visibilityOr.push({ '$assignments.department_id$': department_id });
            }
            letterWhere[Op.or] = visibilityOr;
        }
    }

    const include = [
        {
            model: Letter,
            as: 'letter',
            where: Object.keys(letterWhere).length > 0 ? letterWhere : null,
            attributes: ['id', 'lms_id', 'sender', 'summary', 'encoder_id', 'dept_id'],
            include: [
                { model: LetterKind, as: 'letterKind', attributes: ['kind_name'] }
            ]
        }
    ];

    // Only include assignments if we are actually filtering by it
    if (letterWhere[Op.or]?.some(clause => clause['$assignments.department_id$'])) {
        include[0].include.push({
            model: LetterAssignment,
            as: 'assignments',
            attributes: ['department_id'],
            required: false
        });
    }

    return { where, include };
};

class EndorsementController {
    // GET all endorsements (with letter info)
    static async getAll(req, res) {
        try {
            const { where, include } = buildQueryOptions(req.query);

            const endorsements = await Endorsement.findAll({
                where,
                include,
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
            const { letter_id, endorsed_to, endorsed_by, notes, dept_id } = req.body;
            if (!letter_id || !endorsed_to) {
                return res.status(400).json({ error: 'letter_id and endorsed_to are required.' });
            }
            const record = await Endorsement.create({ letter_id, endorsed_to, endorsed_by, notes, dept_id });
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
            const { where, include } = buildQueryOptions(req.query);
            const count = await Endorsement.count({
                where,
                include,
                distinct: true,
                col: 'id'
            });
            res.json({ count });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = EndorsementController;
