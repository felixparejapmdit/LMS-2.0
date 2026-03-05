const { Letter, LetterAssignment, LetterLog, Person, User, ProcessStep, Status, Endorsement } = require('../models/associations');
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
                }

                // USER can only see their own letters or letters assigned to their department.
                where[Op.or] = visibilityClauses;
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
            res.status(500).json({ error: error.message });
        }
    }

    static async getPreviewIds(req, res) {
        try {
            const now = new Date();
            const yearStr = now.getFullYear().toString();
            const shortYear = yearStr.slice(-2);
            const ymd = yearStr + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0');

            // Annual count for LMS ID
            const annualCount = await Letter.count({
                where: {
                    created_at: { [Op.gte]: new Date(now.getFullYear(), 0, 1) }
                }
            });

            // Daily count for Entry ID
            const dailyCount = await Letter.count({
                where: {
                    created_at: { [Op.gte]: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
                }
            });

            const lms_id = `LMS${shortYear}-${(annualCount + 1).toString().padStart(5, '0')}`;
            const entry_id = `${ymd}${(dailyCount + 1).toString().padStart(3, '0')}`;

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

    static async create(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const {
                sender, summary, encoder_id, encoder, assigned_dept, kind, global_status,
                tray_id, attachment_id, letter_type, vemcode, evemnote, aevmnote, atgnote
            } = req.body;

            // 1. Core Validation
            if (!sender) return res.status(400).json({ error: 'Sender name is required.' });
            if (!summary) return res.status(400).json({ error: 'Letter summary/regarding field is required.' });

            // encoder_id is optional to support Guest Mode (where user object has no ID)

            // Generate IDs
            const now = new Date();
            const yearStr = now.getFullYear().toString();
            const shortYear = yearStr.slice(-2);
            const ymd = yearStr + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0');

            // Find counters
            const annualCount = await Letter.count({
                where: {
                    created_at: { [Op.gte]: new Date(now.getFullYear(), 0, 1) }
                }
            });

            const dailyCount = await Letter.count({
                where: {
                    created_at: { [Op.gte]: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
                }
            });

            const lms_id = `LMS${shortYear}-${(annualCount + 1).toString().padStart(5, '0')}`;
            const entry_id = `${ymd}${(dailyCount + 1).toString().padStart(3, '0')}`;

            // Sanitize numeric fields (convert "" to null)
            const sanitizeInt = (val) => (val === "" || val === undefined || val === null) ? null : parseInt(val);

            // find "Incoming" status ID dynamically or default to 1
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
                attachment_id: sanitizeInt(attachment_id),
                letter_type: letter_type || 'Non-Confidential',
                vemcode,
                evemnote,
                aevmnote,
                atgnote
            };

            const letter = await Letter.create(letterData, { transaction });

            // Create entry in Person collection only if name doesn't already exist
            // Multiple persons should be separated by semicolon (;) to preserve "Lastname, Firstname" format
            const senderNames = sender.split(';').map(n => n.trim()).filter(n => n.length > 0 && n.includes(','));

            // Also include the encoder name if provided as a formatted string (from GuestSendLetter)
            const namesToSync = [...senderNames];
            if (encoder && encoder.includes(',')) {
                namesToSync.push(encoder.trim());
            }

            // Deduplicate and sync to Person table
            for (const name of [...new Set(namesToSync)]) {
                const existing = await Person.findOne({ where: { name }, transaction });
                if (!existing) {
                    await Person.create({ name, name_id: lms_id }, { transaction });
                }
            }

            let targetStepId = null; // Initialize targetStepId outside the if block

            // 2. If initial assignment provided, create assignment
            if (assigned_dept && assigned_dept !== "") {
                // Find "For Signature" step for this department
                // Match either "Signature" or "Endorsement" (common terminologies in the system DNA)
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

                // If not found by keyword, fallback to the very first step of that department
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
                    assigned_by: encoder_id,
                    status: 'Pending',
                    due_date: new Date(now.getTime() + 86400000 * 7)
                }, { transaction });
            }

            // 3. Log the action
            const stepName = (targetStepId) ? (await ProcessStep.findByPk(targetStepId, { transaction }))?.step_name || 'Workflow Step' : 'initial step';
            await LetterLog.create({
                letter_id: letter.id,
                user_id: encoder_id || null,
                action_type: 'Created',
                department_id: assigned_dept || null,
                log_details: `Letter created and initially assigned to ${stepName}.`
            }, { transaction });

            await transaction.commit();
            res.status(201).json(letter);
        } catch (error) {
            await transaction.rollback();
            console.error("Letter creation failed on backend:", error);
            res.status(400).json({ error: `Backend Error: ${error.message}` });
        }
    }

    static async update(req, res) {
        try {
            const letter = await Letter.findByPk(req.params.id);
            if (!letter) return res.status(404).json({ error: 'Not found' });
            await letter.update(req.body);
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
