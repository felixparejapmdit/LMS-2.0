const { LetterAssignment, Letter, ProcessStep, Department, Status, Tray, LetterKind, Comment, Endorsement, User, sequelize } = require('../models/associations');
const { Op } = require('sequelize');
const ALL_LETTER_ROLES = new Set([
    'ADMIN',
    'ADMINISTRATOR',
    'SUPERUSER',
    'SUPER USER',
    'SYSTEM ADMIN',
    'SYSTEMADMIN',
    'SUPER ADMIN',
    'SUPERADMIN',
    'DEVELOPER',
    'ROOT'
]);

class LetterAssignmentController {
    static async getAll(req, res) {
        const startTime = Date.now();
        try {
            const { department_id, step_id, status, vip, global_status, named_filter, user_id, role, page = 1, limit = 50, full_name } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const queryLimit = parseInt(limit);
            const where = {};

            console.log(`[ASSIGNMENTS] Lookup started: role="${role}", dept="${department_id}", name="${full_name}"`);

            const normalizedRole = role ? role.toString().toUpperCase() : '';
            let atgStatusId = null;
            if (vip === 'true' || req.query.exclude_vip === 'true' || named_filter === 'atg_note') {
                const atgStatus = await Status.findOne({ where: { status_name: 'ATG Note' } });
                atgStatusId = atgStatus?.id || null;
            }

            const SUPER_ROLES = new Set(['SUPERUSER', 'SUPER USER', 'SYSTEM ADMIN', 'SYSTEMADMIN', 'SUPER ADMIN', 'SUPERADMIN', 'DEVELOPER', 'ROOT']);
            const isSuperAdmin = SUPER_ROLES.has(normalizedRole);
            const isAdminActual = isSuperAdmin || ['ADMINISTRATOR', 'ADMIN'].includes(normalizedRole);
            const isValidId = (id) => id && id !== 'all' && id !== 'null' && id !== 'undefined' && id !== '';
            const isSpecificDept = isValidId(department_id);

            // Fetch user's department for secure filtering
            const userRecord = user_id ? await User.findByPk(user_id) : null;
            const myDeptId = userRecord?.dept_id;

            const visibilityClauses = [];

            if (user_id) {
                // Involvement by user ID (Always Visible)
                visibilityClauses.push({ '$letter.encoder_id$': user_id });
                visibilityClauses.push({ '$letter.sender$': user_id });
                visibilityClauses.push({ '$letter.endorsed$': user_id });
                
                if (full_name) {
                    const nameParts = full_name.split(' ').filter(p => p.length > 0);
                    const nameMatches = [`%${full_name}%`];
                    if (nameParts.length >= 2) {
                        nameMatches.push(`%${nameParts[nameParts.length - 1]}, ${nameParts[0]}%`);
                    }
                    
                    nameMatches.forEach(match => {
                        visibilityClauses.push({ '$letter.sender$': { [Op.like]: match } });
                        visibilityClauses.push({ '$letter.endorsed$': { [Op.like]: match } });
                        visibilityClauses.push(sequelize.literal(`EXISTS (SELECT 1 FROM endorsements e WHERE e.letter_id = LetterAssignment.letter_id AND e.endorsed_to LIKE ${sequelize.escape(match)})`));
                    });
                }
            }

            if (isSpecificDept) {
                // Only allow department filter if it's THEIR department or they are Super Admin
                if (isSuperAdmin || department_id == myDeptId) {
                    visibilityClauses.push({ department_id: department_id });
                }
            } else if (isAdminActual && !isSuperAdmin) {
                // If an Admin looks at "all", restricted to their own department
                if (myDeptId) {
                    visibilityClauses.push({ department_id: myDeptId });
                }
            }

            if (visibilityClauses.length > 0) {
                where[Op.or] = visibilityClauses;
            } else if (!isSuperAdmin) {
                // Non-admins with no involvement and no department access see nothing
                where.id = null;
            }
            // Super Admins with no filters see everything

            if (step_id && step_id !== 'null') where.step_id = step_id;

            // status filter from query now maps to status_id if numeric, otherwise we filter by joined status name
            if (status && status !== 'null') {
                if (!isNaN(status)) {
                    where.status_id = parseInt(status);
                } else if (named_filter !== 'hold' && named_filter !== 'atg_note') {
                    // Fallback to searching by status name in the joined table if it's not a numeric ID
                    where['$letter.status.status_name$'] = status;
                }
            }

            if (global_status) where['$letter.global_status$'] = global_status;

            if (vip === 'true') {
                where[Op.and] = [
                    { '$letter.tray_id$': { [Op.or]: [null, 0] } },
                    {
                        [Op.or]: [
                            { '$letter.global_status$': 2 },
                            { '$letter.status.status_name$': 'ATG Note' }
                        ]
                    }
                ];
            } else if (req.query.exclude_vip === 'true') {
                where[Op.or] = [
                    { '$letter.tray_id$': { [Op.not]: null, [Op.not]: 0 } },
                    {
                        [Op.and]: [
                            { '$letter.global_status$': { [Op.ne]: 2 } },
                            { '$letter.status.status_name$': { [Op.ne]: 'ATG Note' } }
                        ]
                    }
                ];
            } else if (named_filter === 'atg_note') {
                where['$letter.tray_id$'] = { [Op.gt]: 0 };
                where['$letter.global_status$'] = 1;
            }

            const { count, rows } = await LetterAssignment.findAndCountAll({
                where,
                include: [
                    {
                        model: Letter,
                        as: 'letter',
                        include: [
                            { model: Status, as: 'status' },
                            { model: User, as: 'encoder' },
                            'letterKind',
                            'tray'
                        ]
                    },
                    { model: ProcessStep, as: 'step' },
                    { model: Department, as: 'department' }
                ],
                order: [['created_at', 'DESC']],
                limit: queryLimit,
                offset: offset,
                distinct: true,
                subQuery: false
            });

            console.log(`[ASSIGNMENTS] Fetched ${rows.length} items in ${Date.now() - startTime}ms`);

            res.json({
                total: count,
                pages: Math.ceil(count / queryLimit),
                currentPage: parseInt(page),
                items: rows
            });
        } catch (error) {
            console.error('[ASSIGNMENTS ERROR]:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = LetterAssignmentController;