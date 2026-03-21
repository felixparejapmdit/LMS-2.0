const { Letter, LetterAssignment, LetterLog, Person, User, ProcessStep, Status, Endorsement, Department, Tray, LetterKind, Comment } = require('../models/associations');
const sequelize = require('../config/db');
const { Op } = require('sequelize');

class LetterController {
    static async getAll(req, res) {
        try {
            const { user_id, role, department_id } = req.query;
            const where = {};

            const normalizedRole = role ? role.toString().toUpperCase() : '';

            if (normalizedRole === 'USER' && user_id) {
                const hasValidDepartment = department_id && department_id !== 'null' && department_id !== 'undefined' && department_id !== '';
                const visibilityClauses = [{ encoder_id: user_id }];
                if (hasValidDepartment) {
                    visibilityClauses.push({ '$assignments.department_id$': department_id });
                    visibilityClauses.push({ dept_id: department_id });
                }
                where[Op.or] = visibilityClauses;
            } else if (normalizedRole === 'ACCESS MANAGER' && department_id) {
                where[Op.or] = [
                    { dept_id: department_id },
                    { '$assignments.department_id$': department_id }
                ];
            } else if (req.query.dept_id && req.query.dept_id !== 'all') {
                // If Administrator or other role explicitly provides dept_id
                where.dept_id = (req.query.dept_id === 'null' || req.query.dept_id === 'undefined') ? null : req.query.dept_id;
            }

            const results = await Letter.findAll({
                where,
                include: [
                    'letterKind',
                    'status',
                    'attachment',
                    'tray',
                    'comments',
                    { model: LetterAssignment, as: 'assignments', include: ['step', 'department'] },
                    { model: Endorsement, as: 'endorsements' }
                ],
                order: [['created_at', 'DESC']],
                subQuery: false
            });
            res.json(results);
        } catch (error) {
            console.error("[ERROR] LetterController.getAll:", error);
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    }

    static async getPreviewIds(req, res) {
        try {
            const now = new Date();
            const yearStr = now.getFullYear().toString();
            const shortYear = yearStr.slice(-2);
            const ymd = yearStr + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0');

            // Find counters via Max sequence
            const lastYearEntry = await Letter.findOne({
                where: { lms_id: { [Op.like]: `LMS${shortYear}-%` } },
                order: [['lms_id', 'DESC']]
            });

            const lastDayEntry = await Letter.findOne({
                where: { entry_id: { [Op.like]: `${ymd}%` } },
                order: [['entry_id', 'DESC']]
            });

            let annualSequence = 1;
            if (lastYearEntry) {
                const parts = lastYearEntry.lms_id.split('-');
                if (parts.length > 1) {
                    const lastSeq = parseInt(parts[1]);
                    if (!isNaN(lastSeq)) annualSequence = lastSeq + 1;
                }
            }

            let dailySequence = 1;
            if (lastDayEntry) {
                const lastSeqStr = lastDayEntry.entry_id.slice(-3);
                const lastSeq = parseInt(lastSeqStr);
                if (!isNaN(lastSeq)) dailySequence = lastSeq + 1;
            }

            const lms_id = `LMS${shortYear}-${annualSequence.toString().padStart(5, '0')}`;
            const entry_id = `${ymd}${dailySequence.toString().padStart(3, '0')}`;

            res.json({ lms_id, entry_id });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const result = await Letter.findByPk(req.params.id, {
                include: [
                    'letterKind',
                    'status',
                    'attachment',
                    'tray',
                    { model: LetterAssignment, as: 'assignments', include: ['department', 'step'] },
                    { model: LetterLog, as: 'logs', include: ['user'] },
                    { model: User, as: 'encoder', attributes: ['id', 'first_name', 'last_name', 'email'] }
                ]
            });
            if (!result) return res.status(404).json({ error: 'Not found' });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getByLmsId(req, res) {
        try {
            const { lms_id } = req.params;
            const result = await Letter.findOne({
                where: { lms_id: { [Op.like]: lms_id } },
                include: [
                    'letterKind',
                    'status',
                    'attachment',
                    'tray',
                ]
            });
            if (!result) return res.status(404).json({ error: 'Letter not found' });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        // Set a high busy timeout to avoid contention with Directus
        try {
            await sequelize.query('PRAGMA busy_timeout = 15000');
        } catch (e) { }

        const transaction = await sequelize.transaction();
        try {
            const {
                sender, summary, encoder_id, encoder, assigned_dept, kind, global_status,
                tray_id, attachment_id, letter_type, vemcode, aevm_number, evemnote, aevmnote, atgnote, dept_id
            } = req.body;

            const isUUID = (val) => {
                if (!val) return false;
                const s = "" + val;
                const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                return regex.test(s);
            };

            const validEncoderId = isUUID(encoder_id) ? encoder_id : null;

            // 1. Core Validation
            if (!sender) {
                if (transaction) await transaction.rollback();
                return res.status(400).json({ error: 'Sender name is required.' });
            }
            if (!summary) {
                if (transaction) await transaction.rollback();
                return res.status(400).json({ error: 'Letter summary/regarding field is required.' });
            }

            // Generate IDs
            const now = new Date();
            const yearStr = now.getFullYear().toString();
            const shortYear = yearStr.slice(-2);
            const ymd = yearStr + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0');

            // Find counters via Max sequence
            const lastYearEntry = await Letter.findOne({
                where: { lms_id: { [Op.like]: `LMS${shortYear}-%` } },
                order: [['lms_id', 'DESC']],
                transaction
            });

            const lastDayEntry = await Letter.findOne({
                where: { entry_id: { [Op.like]: `${ymd}%` } },
                order: [['entry_id', 'DESC']],
                transaction
            });

            let annualSequence = 1;
            if (lastYearEntry) {
                const parts = lastYearEntry.lms_id.split('-');
                if (parts.length > 1) {
                    const lastSeq = parseInt(parts[1]);
                    if (!isNaN(lastSeq)) annualSequence = lastSeq + 1;
                }
            }

            let dailySequence = 1;
            if (lastDayEntry) {
                const lastSeqStr = lastDayEntry.entry_id.slice(-3);
                const lastSeq = parseInt(lastSeqStr);
                if (!isNaN(lastSeq)) dailySequence = lastSeq + 1;
            }

            const lms_id = `LMS${shortYear}-${annualSequence.toString().padStart(5, '0')}`;
            const entry_id = `${ymd}${dailySequence.toString().padStart(3, '0')}`;

            // Sanitize numeric fields
            const sanitizeInt = (val) => (val === "" || val === undefined || val === null) ? null : parseInt(val);

            // find "Incoming" status
            const incomingStatus = await Status.findOne({ where: { status_name: 'Incoming' }, transaction });
            const finalGlobalStatus = sanitizeInt(global_status) || incomingStatus?.id || 1;

            const letterData = {
                ...req.body,
                lms_id,
                entry_id,
                date_received: req.body.date_received || now,
                kind: sanitizeInt(kind),
                global_status: finalGlobalStatus,
                tray_id: sanitizeInt(tray_id),
                attachment_id: attachment_id,
                letter_type: letter_type || 'Non-Confidential',
                vemcode,
                evemnote,
                aevmnote,
                atgnote,
                aevm_number,
                encoder_id: validEncoderId // Ensure we use the validated UUID or null
            };

            const letter = await Letter.create(letterData, { transaction });

            // Sync to Person table
            const senderNames = sender.split(';').map(n => n.trim()).filter(n => n.length > 0 && n.includes(','));
            const namesToSync = [...senderNames];
            if (encoder && encoder.includes(',')) {
                namesToSync.push(encoder.trim());
            }

            for (const name of [...new Set(namesToSync)]) {
                const existing = await Person.findOne({ where: { name }, transaction });
                if (!existing) {
                    await Person.create({ name, name_id: lms_id }, { transaction });
                }
            }

            let targetStepId = null;
            if (assigned_dept && assigned_dept !== "") {
                const sigStep = await ProcessStep.findOne({
                    where: {
                        dept_id: assigned_dept,
                        [Op.or]: [
                            { step_name: { [Op.like]: '%Signature%' } },
                            { step_name: { [Op.like]: '%Endorsement%' } }
                        ]
                    },
                    transaction
                });

                targetStepId = sigStep?.id;
                if (!targetStepId) {
                    const fallbackStep = await ProcessStep.findOne({
                        where: { dept_id: assigned_dept },
                        transaction
                    });
                    targetStepId = fallbackStep?.id || 1;
                }

                await LetterAssignment.create({
                    letter_id: letter.id,
                    department_id: assigned_dept,
                    step_id: targetStepId,
                    assigned_by: validEncoderId,
                    status_id: 8, // Explicitly set to Pending
                    due_date: new Date(now.getTime() + 86400000 * 7)
                }, { transaction });
            }

            const stepName = (targetStepId) ? (await ProcessStep.findByPk(targetStepId, { transaction }))?.step_name || 'Workflow Step' : 'initial step';
            await LetterLog.create({
                letter_id: letter.id,
                user_id: validEncoderId,
                action_type: 'Created',
                department_id: assigned_dept || null,
                log_details: `Letter created and initially assigned to ${stepName}.`
            }, { transaction });



            await transaction.commit();
            res.status(201).json(letter);
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error("Letter creation failed on backend - Detailed Info:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            });
            res.status(400).json({ error: `Backend Error during creation: ${error.message}` });
        }
    }

    static async update(req, res) {
        try {
            const letter = await Letter.findByPk(req.params.id);
            if (!letter) return res.status(404).json({ error: 'Not found' });
            const updates = { ...req.body };
            if (Object.prototype.hasOwnProperty.call(updates, 'tray_id')) {
                const parsed = updates.tray_id === "" || updates.tray_id === undefined || updates.tray_id === null
                    ? null
                    : parseInt(updates.tray_id);
                updates.tray_id = Number.isNaN(parsed) ? null : parsed;
            }
            await letter.update(updates);
            res.json(letter);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const letter = await Letter.findByPk(req.params.id);
            if (!letter) return res.status(404).json({ error: 'Not found' });
            await letter.destroy();
            res.json({ message: 'Deleted' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = LetterController;
