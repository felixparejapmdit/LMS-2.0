const { Letter, LetterAssignment, LetterLog, Person, User, ProcessStep, Status, Endorsement, Department, Tray, LetterKind, Comment, Attachment } = require('../models/associations');
const sequelize = require('../config/db');
const { Op } = require('sequelize');

class LetterController {
    static async getAll(req, res) {
        try {
            const { user_id, role, department_id, dept_id, page = 1, limit = 50 } = req.query;
            const where = {};
            
            const normalizedRole = role ? role.toString().toUpperCase().trim() : '';
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const queryLimit = parseInt(limit);

            const isSpecificDept = (department_id || dept_id) && 
                                   (department_id !== 'all' && department_id !== 'null' && department_id !== 'undefined') &&
                                   (dept_id !== 'all' && dept_id !== 'null' && dept_id !== 'undefined');
            
            const targetDeptId = department_id || dept_id;

            if (normalizedRole === 'USER' && user_id) {
                const visibilityClauses = [{ encoder_id: user_id }];
                if (isSpecificDept) {
                    visibilityClauses.push({ '$assignments.department_id$': targetDeptId });
                    visibilityClauses.push({ dept_id: targetDeptId });
                }
                where[Op.or] = visibilityClauses;
            } else if (normalizedRole === 'ACCESS MANAGER' && targetDeptId) {
                where[Op.or] = [
                    { dept_id: targetDeptId },
                    { '$assignments.department_id$': targetDeptId }
                ];
            } else if (isSpecificDept) {
                // For other roles (like Administrator) filtering by dept
                where.dept_id = targetDeptId;
            }

            const { count, rows } = await Letter.findAndCountAll({
                where,
                include: [
                    'letterKind',
                    'status',
                    'attachment',
                    'tray',
                    { 
                        model: LetterAssignment, 
                        as: 'assignments', 
                        include: ['step', 'department'],
                        required: false 
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: queryLimit,
                offset: offset,
                distinct: true
            });

            res.json({
                data: rows,
                total: count,
                page: parseInt(page),
                limit: queryLimit,
                totalPages: Math.ceil(count / queryLimit)
            });
        } catch (error) {
            console.error("[ERROR] LetterController.getAll (Detailed):", {
                message: error.message,
                stack: error.stack,
                query: req.query
            });
            res.status(500).json({ error: "Letter lookup failed: " + error.message });
        }
    }

    static async getDepartmentLetters(req, res) {
        try {
            const { dept_id, page = 1, limit = 50 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const queryLimit = parseInt(limit);

            if (!dept_id || dept_id === 'all') {
                return LetterController.getAll(req, res);
            }

            const { count, rows } = await Letter.findAndCountAll({
                where: {
                    [Op.or]: [
                        { dept_id: dept_id },
                        { '$assignments.department_id$': dept_id }
                    ]
                },
                include: [
                    'letterKind',
                    'status',
                    'attachment',
                    'tray',
                    { 
                        model: LetterAssignment, 
                        as: 'assignments', 
                        include: ['step', 'department'],
                        required: false 
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: queryLimit,
                offset: offset,
                distinct: true
            });

            res.json({
                data: rows,
                total: count,
                page: parseInt(page),
                limit: queryLimit,
                totalPages: Math.ceil(count / queryLimit)
            });
        } catch (error) {
            console.error("[ERROR] LetterController.getDepartmentLetters:", error);
            res.status(500).json({ error: error.message });
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
        let transaction;
        try {
            transaction = await sequelize.transaction();
            // (Foreign key checks are disabled globally in backend/src/config/db.js)

            const {
                sender, summary, encoder_id, encoder, assigned_dept, kind, global_status,
                tray_id, attachment_id, letter_type, vemcode, aevm_number, evemnote, aevmnote, atgnote, dept_id, step_id
            } = req.body;

            const isUUID = (val) => {
                if (!val) return false;
                const s = "" + val;
                const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                return regex.test(s);
            };

            const validEncoderId = isUUID(encoder_id) ? encoder_id : null;

            console.log(`[LETTER_CREATE_DEBUG] Starting validation for: "${sender}" / "${summary}"`);
            // 1. Core Validation
            if (!sender) {
                console.warn("[LETTER_CREATE_DEBUG] Validation Failed: Sender missing");
                if (transaction) await transaction.rollback();
                return res.status(418).json({ error: 'Sender name is required (418).' });
            }
            if (!summary) {
                console.warn("[LETTER_CREATE_DEBUG] Validation Failed: Summary missing");
                if (transaction) await transaction.rollback();
                return res.status(418).json({ error: 'Letter summary/regarding field is required (418).' });
            }
            console.log("[LETTER_CREATE_DEBUG] Core validation passed.");

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

            console.log(`[LETTER_CREATE_DEBUG] ID Scan: Last Year=${lastYearEntry?.lms_id}, Last Day=${lastDayEntry?.entry_id}`);

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

            // Collision Defense: Keep incrementing if ID exists (handles gaps/manual inserts)
            let lms_id = `LMS${shortYear}-${annualSequence.toString().padStart(5, '0')}`;
            let entry_id = `${ymd}${dailySequence.toString().padStart(3, '0')}`;
            
            let attempts = 0;
            while (attempts < 50) {
                const existingLms = await Letter.findOne({ where: { lms_id }, transaction });
                const existingEntry = await Letter.findOne({ where: { entry_id }, transaction });
                
                if (!existingLms && !existingEntry) break;
                
                console.warn(`[LETTER_CREATE_DEBUG] ID Collision detected for ${lms_id}/${entry_id}. Retrying...`);
                if (existingLms) {
                    annualSequence++;
                    lms_id = `LMS${shortYear}-${annualSequence.toString().padStart(5, '0')}`;
                }
                if (existingEntry) {
                    dailySequence++;
                    entry_id = `${ymd}${dailySequence.toString().padStart(3, '0')}`;
                }
                attempts++;
            }

            console.log(`[LETTER_CREATE] Final Assigned IDs: LMS_ID=${lms_id}, ENTRY_ID=${entry_id}`);

            // Sanitize numeric fields to ensure they are valid integers or null
            const sanitizeInt = (val) => {
                if (val === "" || val === undefined || val === null) return null;
                const parsed = parseInt(val);
                return isNaN(parsed) ? null : parsed;
            };

            const incomingStatus = await Status.findOne({ where: { status_name: 'Incoming' }, transaction });
            const finalGlobalStatus = sanitizeInt(global_status) || incomingStatus?.id || 1;

            // Handle date with fallback
            let receivedDate = new Date();
            if (req.body.date_received && req.body.date_received !== "") {
                const parsedDate = new Date(req.body.date_received);
                if (!isNaN(parsedDate.getTime())) {
                    receivedDate = parsedDate;
                }
            }

            const letterData = {
                lms_id,
                entry_id,
                date_received: receivedDate,
                sender: sender,
                summary: summary,
                kind: sanitizeInt(kind),
                global_status: finalGlobalStatus,
                tray_id: sanitizeInt(tray_id),
                attachment_id: sanitizeInt(attachment_id),
                direction: req.body.direction || 'Incoming',
                letter_type: letter_type || 'Non-Confidential',
                vemcode: vemcode || null,
                aevm_number: aevm_number || null,
                evemnote: evemnote || null,
                aevmnote: aevmnote || null,
                atgnote: atgnote || null,
                scanned_copy: req.body.scanned_copy || null,
                encoder_id: validEncoderId,
                dept_id: sanitizeInt(dept_id)
            };

            // Final data preparation
            const targetEncoderId = validEncoderId || null;
            const targetDeptId = sanitizeInt(dept_id) || null;

            console.log(`[LETTER_CREATE_DEBUG] Objects Prepared: lms_id=${letterData.lms_id}, entry_id=${letterData.entry_id}`);
            console.log(`[LETTER_CREATE_DEBUG] Full Data: ${JSON.stringify(letterData, null, 2)}`);

            const letter = await Letter.create(letterData, { transaction });
            console.log(`[LETTER_CREATE] Success! id ${letter.id}`);

            await transaction.commit();
            res.status(201).json(letter);
        } catch (error) {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
            console.error("[LETTER_CREATE_DEBUG] FATAL ERROR:", error);
            
            try {
                const fs = require('fs');
                const logMsg = `[${new Date().toISOString()}] ERROR: ${error.message}\nSTACK: ${error.stack}\nBODY: ${JSON.stringify(req.body, null, 2)}\n\n`;
                fs.appendFileSync('./backend_error.log', logMsg);
            } catch (e) {}

            res.status(418).json({ 
                error: `Backend Fatal: ${error.message}`,
                details: error.name,
                stack: error.stack,
                fullError: error
            });
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
