const { Letter, LetterAssignment, LetterLog, Person, User, ProcessStep, Status, Endorsement, Department, Tray, LetterKind, Comment, Attachment } = require('../models/associations');
const sequelize = require('../config/db');
const { Op } = require('sequelize');

class LetterController {
    static async getAll(req, res) {
        try {
            const { user_id, role, department_id, dept_id, page = 1, limit = 50, full_name } = req.query;
            const where = {};

            const normalizedRole = role ? role.toString().toUpperCase().trim() : '';
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const queryLimit = parseInt(limit);

            const isValidId = (id) => id && id !== 'all' && id !== 'null' && id !== 'undefined' && id !== '';
            const isSpecificDept = isValidId(department_id) || isValidId(dept_id);
            const targetDeptId = isValidId(department_id) ? department_id : (isValidId(dept_id) ? dept_id : null);

            const SUPER_ROLES = ['ADMINISTRATOR'];
            const isSuperAdmin = SUPER_ROLES.includes(normalizedRole);
            const isAdmin = isSuperAdmin || ['ADMINISTRATOR'].includes(normalizedRole);

            // Fetch the user's actual department from the database for secure filtering
            const userRecord = user_id ? await User.findByPk(user_id) : null;
            const myDeptId = userRecord?.dept_id;

            const visibilityClauses = [];
            
            // 1. Direct Involvement by ID (Always Visible)
            if (user_id) {
                visibilityClauses.push({ encoder_id: user_id });
                visibilityClauses.push({ sender: user_id });
                visibilityClauses.push({ endorsed: user_id });
                
                if (full_name) {
                    const nameParts = full_name.split(' ').filter(p => p.length > 0);
                    const nameMatches = [`%${full_name}%`];
                    if (nameParts.length >= 2) {
                        nameMatches.push(`%${nameParts[nameParts.length - 1]}, ${nameParts[0]}%`);
                    }
                    
                    nameMatches.forEach(match => {
                        visibilityClauses.push({ sender: { [Op.like]: match } });
                        visibilityClauses.push({ endorsed: { [Op.like]: match } });
                        visibilityClauses.push(sequelize.literal(`EXISTS (SELECT 1 FROM endorsements e WHERE e.letter_id = Letter.id AND e.endorsed_to LIKE ${sequelize.escape(match)})`));
                    });
                }
            }

            // 2. Department-based Visibility
            if (isSuperAdmin) {
                visibilityClauses.push(sequelize.literal('1=1'));
            } else if (isAdmin) {
                if (myDeptId) {
                    if (!isSpecificDept || targetDeptId == myDeptId) {
                        visibilityClauses.push({ dept_id: String(myDeptId) });
                        visibilityClauses.push(sequelize.literal(`EXISTS (
                            SELECT 1 FROM directus_users du
                            WHERE du.dept_id = ${sequelize.escape(String(myDeptId))}
                            AND (
                                du.id = Letter.encoder_id
                                OR du.id = Letter.sender
                                OR du.id = Letter.endorsed
                                OR Letter.sender LIKE ('%' || du.first_name || '%')
                                OR Letter.sender LIKE ('%' || du.last_name || '%')
                                OR Letter.endorsed LIKE ('%' || du.first_name || '%')
                                OR Letter.endorsed LIKE ('%' || du.last_name || '%')
                            )
                        )`));
                        visibilityClauses.push(sequelize.literal(`EXISTS (SELECT 1 FROM letter_assignments la WHERE la.letter_id = Letter.id AND la.department_id = ${sequelize.escape(String(myDeptId))})`));
                    }
                }
            }

            if (visibilityClauses.length > 0) {
                where[Op.or] = visibilityClauses;
            }
            // Super admins see everything if no specific involvement or dept is set
            else if (!isSuperAdmin) {
                // Non-super-admins with no involvement and no valid department access see nothing
                where.id = null;
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
                    },
                    {
                        model: Endorsement,
                        as: 'endorsements',
                        required: false
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: queryLimit,
                offset: offset,
                distinct: true,
                subQuery: false
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
                distinct: true,
                subQuery: false
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
                    { 
                        model: LetterAssignment, 
                        as: 'assignments', 
                        include: [
                            { model: Department, as: 'department' },
                            { model: ProcessStep, as: 'step' }
                        ] 
                    },
                    { 
                        model: LetterLog, 
                        as: 'logs', 
                        include: [
                            { model: User, as: 'user' },
                            { model: Department, as: 'department' },
                            { model: ProcessStep, as: 'step' },
                            { model: Status, as: 'status' }
                        ] 
                    },
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
                sender: sender || 'Unknown Sender',
                summary: summary || 'No Summary Provided',
                kind: sanitizeInt(kind),
                global_status: finalGlobalStatus || 1,
                tray_id: sanitizeInt(tray_id) || null,
                attachment_id: sanitizeInt(attachment_id) || null,
                direction: req.body.direction || 'Incoming',
                letter_type: letter_type || 'Non-Confidential',
                vemcode: vemcode || null,
                aevm_number: aevm_number || null,
                evemnote: evemnote || null,
                aevmnote: aevmnote || null,
                atgnote: atgnote || null,
                scanned_copy: req.body.scanned_copy || null,
                encoder_id: validEncoderId || null,
                dept_id: sanitizeInt(dept_id) || null,
                show_atg: false,
                processed_by: null,
                processed_date: null
            };

            console.log(`[LETTER_CREATE_DEBUG] Final Payload for DB: ${JSON.stringify(letterData, null, 2)}`);

            const letter = await Letter.create(letterData, { transaction });
            console.log(`[LETTER_CREATE] Success! id ${letter.id}`);

            // Sync to Person table (for Sender autocomplete)
            const namesToSync = [];
            if (sender) {
                sender.split(';').map(n => n.trim()).filter(n => n.length > 0 && n.includes(',')).forEach(n => namesToSync.push(n));
            }
            if (req.body.endorse_to && req.body.endorse_to.trim().includes(',')) {
                namesToSync.push(req.body.endorse_to.trim());
            }

            for (const name of [...new Set(namesToSync)]) {
                const existing = await Person.findOne({ where: { name }, transaction });
                if (!existing) {
                    await Person.create({ name, name_id: lms_id }, { transaction });
                }
            }

            // 3. Post-Creation Orchestration: Handle Multiple Step Assignments
            const targetEncoderId = validEncoderId || null;
            const targetDeptId = sanitizeInt(dept_id) || null;
            const validAssignedDept = sanitizeInt(assigned_dept) || targetDeptId;

            let finalStepIds = [];
            if (Array.isArray(req.body.step_ids) && req.body.step_ids.length > 0) {
                finalStepIds = req.body.step_ids.map(id => sanitizeInt(id)).filter(id => id !== null);
            } else if (step_id) {
                const sid = sanitizeInt(step_id);
                if (sid) finalStepIds = [sid];
            }

            // Fallback to auto-assignment if no steps provided but dept is set
            if (finalStepIds.length === 0 && validAssignedDept) {
                const sigStep = await ProcessStep.findOne({
                    where: {
                        dept_id: validAssignedDept,
                        [Op.or]: [
                            { step_name: { [Op.like]: '%Signature%' } },
                            { step_name: { [Op.like]: '%Endorsement%' } }
                        ]
                    },
                    transaction
                });

                let fallbackId = sigStep?.id;
                if (!fallbackId) {
                    const firstStep = await ProcessStep.findOne({ where: { dept_id: validAssignedDept }, transaction });
                    fallbackId = firstStep?.id;
                }
                if (fallbackId) finalStepIds = [fallbackId];
            }

            if (finalStepIds.length > 0) {
                for (const sid of finalStepIds) {
                    const stepObj = await ProcessStep.findByPk(sid, { transaction });
                    const stepDeptId = stepObj?.dept_id || validAssignedDept;

                    await LetterAssignment.create({
                        letter_id: letter.id,
                        department_id: stepDeptId,
                        step_id: sid,
                        assigned_by: targetEncoderId,
                        status_id: finalGlobalStatus
                    }, { transaction });

                    await LetterLog.create({
                        letter_id: letter.id,
                        user_id: targetEncoderId,
                        action_type: 'Created',
                        department_id: stepDeptId,
                        step_id: sid,
                        status_id: finalGlobalStatus || 1,
                        metadata: { marginal_note: req.body.marginal_note },
                        log_details: `Letter created and initially assigned to ${stepObj?.step_name || 'Workflow Step'}.`
                    }, { transaction });
                }
            } else {
                await LetterLog.create({
                    letter_id: letter.id,
                    user_id: targetEncoderId,
                    action_type: 'Created',
                    department_id: validAssignedDept || targetDeptId,
                    log_details: `Letter created with no initial workflow step assigned.`
                }, { transaction });
            }

            await transaction.commit();
            res.status(201).json(letter);
        } catch (error) {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
            console.error("[LETTER_CREATE_DEBUG] DATABASE REJECTED SAVE:", error);

            try {
                const fs = require('fs');
                const logMsg = `[${new Date().toISOString()}] ERROR: ${error.message}\nSTACK: ${error.stack}\nBODY: ${JSON.stringify(req.body, null, 2)}\nDATA: ${JSON.stringify(error.parent || {}, null, 2)}\n\n`;
                fs.appendFileSync('./backend_error.log', logMsg);
            } catch (e) { }

            res.status(400).json({
                error: `Database Rejection: ${error.message}`,
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
            if (Object.prototype.hasOwnProperty.call(updates, 'kind')) {
                const parsed = updates.kind === "" || updates.kind === undefined || updates.kind === null
                    ? null
                    : parseInt(updates.kind);
                updates.kind = Number.isNaN(parsed) ? null : parsed;
            }
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