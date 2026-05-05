const { LetterAssignment, Letter, Status, User, Role, sequelize } = require('../models/associations');
const { Op } = require('sequelize');

/**
 * OutboxController
 * Dedicated controller for Outbox statistics and tab counts.
 * Completely separate from StatsController to avoid affecting Inbox logic.
 */
class OutboxController {
    /**
     * GET /api/outbox/stats
     * Returns per-status letter counts for the Outbox tabs.
     * Statuses are fetched dynamically from ref_statuses so the UI stays in sync.
     *
     * Query params:
     *   user_id, role, full_name, department_id, search
     */
    static async getStats(req, res) {
        try {
            const {
                department_id,
                user_id,
                role,
                full_name: queryFullName,
                search
            } = req.query;

            // ── 1. Resolve the calling user ────────────────────────────────────────
            const userRecord = user_id
                ? await User.findByPk(user_id, { include: [{ model: Role, as: 'roleData' }] })
                : null;

            const myDeptId   = userRecord?.dept_id;
            const roleName   = userRecord?.roleData?.name || role || '';
            const full_name  = userRecord
                ? `${userRecord.first_name || ''} ${userRecord.last_name || ''}`.trim()
                : (queryFullName || '');

            const normalizedRole = roleName.toString().toUpperCase().trim();
            const SUPER_ROLES    = ['ADMINISTRATOR', 'ADMIN', 'VIP'];
            const isSuperAdmin   = SUPER_ROLES.includes(normalizedRole);
            const isAdmin        = SUPER_ROLES.includes(normalizedRole);

            const isValidId = (id) =>
                id && id !== 'all' && id !== 'null' && id !== 'undefined' && id !== '';
            const isSpecificDept = isValidId(department_id);

            // ── 2. Build visibility filter on LetterAssignment ────────────────────
            const where = {};
            const visibilityClauses = [];

            if (user_id) {
                // Letters the user sent / encoded / endorsed directly
                visibilityClauses.push({ '$letter.encoder_id$': user_id });
                visibilityClauses.push({ '$letter.sender$':     user_id });
                visibilityClauses.push({ '$letter.endorsed$':   user_id });

                if (full_name) {
                    const nameParts  = full_name.split(' ').filter(p => p.length > 0);
                    const nameMatches = [`%${full_name}%`];
                    if (nameParts.length >= 2) {
                        // Handle "Last, First" format too
                        nameMatches.push(`%${nameParts[nameParts.length - 1]}, ${nameParts[0]}%`);
                    }
                    nameMatches.forEach(match => {
                        visibilityClauses.push({ '$letter.sender$':   { [Op.like]: match } });
                        visibilityClauses.push({ '$letter.endorsed$': { [Op.like]: match } });
                    });
                }
            }

            if (isSuperAdmin) {
                // Super admin sees all letters globally
                visibilityClauses.push(sequelize.literal('1=1'));
            } else if (isAdmin && myDeptId) {
                const targetDeptId = isSpecificDept ? department_id : myDeptId;
                // Department-scoped: letters assigned to this department
                visibilityClauses.push({ department_id: String(targetDeptId) });
            }

            if (visibilityClauses.length > 0) {
                where[Op.or] = visibilityClauses;
            } else if (!isSuperAdmin) {
                // Safety net: no visibility means no results
                where.id = null;
            }

            // ── 3. Optional search filter (sender name OR reference code) ─────────
            if (search && search.trim()) {
                const searchVal = `%${search.trim()}%`;
                const searchClause = {
                    [Op.or]: [
                        { '$letter.sender$':  { [Op.like]: searchVal } },
                        { '$letter.lms_id$':  { [Op.like]: searchVal } },
                        { '$letter.summary$': { [Op.like]: searchVal } }
                    ]
                };
                if (!where[Op.and]) where[Op.and] = [];
                where[Op.and].push(searchClause);
            }

            // ── 4. Fetch outbox statuses dynamically from ref_statuses ─────────────
            // These keywords cover the standard terminal statuses for outgoing letters.
            const OUTBOX_KEYWORDS = ['Released', 'Done', 'Filed', 'Forwarded', 'Endorsed', 'Dispatched'];

            const outboxStatuses = await Status.findAll({
                where: {
                    [Op.or]: OUTBOX_KEYWORDS.map(kw => ({
                        status_name: { [Op.like]: `%${kw}%` }
                    }))
                },
                attributes: ['id', 'status_name'],
                order: [['id', 'ASC']],
                raw: true
            });

            if (outboxStatuses.length === 0) {
                return res.json({ statuses: [], counts: {} });
            }

            // ── 5. Count letters per status (parallel queries) ────────────────────
            const statusIds = outboxStatuses.map(s => s.id);

            const counts = await Promise.all(
                outboxStatuses.map(async (s) => {
                    const count = await LetterAssignment.count({
                        where: {
                            ...where,
                            '$letter.global_status$': s.id
                        },
                        include: [{ model: Letter, as: 'letter', required: true }],
                        distinct: true,
                        col: 'letter_id'
                    });
                    return { id: s.id, status_name: s.status_name, count };
                })
            );

            // ── 6. Build response ─────────────────────────────────────────────────
            // Returns both the ordered status list (for tab rendering) and a counts map
            const countsMap = {};
            counts.forEach(c => {
                countsMap[c.status_name.toLowerCase()] = c.count;
            });

            res.json({
                // Ordered list so the frontend can render tabs in the correct DB order
                statuses: outboxStatuses.map(s => ({
                    id:          s.id,
                    status_name: s.status_name,
                    count:       countsMap[s.status_name.toLowerCase()] ?? 0
                })),
                // Flat map for quick count lookup by lowercase name
                counts: countsMap
            });

        } catch (error) {
            console.error('[OUTBOX STATS ERROR]', error.message, error.stack);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = OutboxController;
