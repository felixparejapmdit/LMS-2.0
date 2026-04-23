const {
  Letter,
  LetterAssignment,
  LetterLog,
  Person,
  User,
  ProcessStep,
  Status,
  Endorsement,
  Department,
  Tray,
  LetterKind,
  Comment,
  Attachment,
} = require("../models/associations");
const sequelize = require("../config/db");
const { Op } = require("sequelize");
const TelegramService = require("../services/telegramService");

class LetterController {
  static async getAll(req, res) {
    try {
      const {
        user_id,
        role,
        department_id,
        dept_id,
        page = 1,
        limit = 50,
        full_name,
      } = req.query;
      const where = {};

      const normalizedRole = role ? role.toString().toUpperCase().trim() : "";
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const queryLimit = parseInt(limit);

      const isValidId = (id) =>
        id && id !== "all" && id !== "null" && id !== "undefined" && id !== "";
      const isSpecificDept = isValidId(department_id) || isValidId(dept_id);
      const targetDeptId = isValidId(department_id)
        ? department_id
        : isValidId(dept_id)
          ? dept_id
          : null;

      const SUPER_ADMIN_ROLES = ["ADMINISTRATOR", "ADMIN", "SUPER ADMIN"];
      const DEPT_ADMIN_ROLES = ["ACCESS MANAGER", "VIP", "MANAGER"];

      const isSuperAdmin = SUPER_ADMIN_ROLES.includes(normalizedRole);
      const isDeptAdmin = DEPT_ADMIN_ROLES.includes(normalizedRole);
      const isAdmin = isSuperAdmin || isDeptAdmin;

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
          const nameParts = full_name.split(" ").filter((p) => p.length > 0);
          const nameMatches = [`%${full_name}%`];
          if (nameParts.length >= 2) {
            nameMatches.push(
              `%${nameParts[nameParts.length - 1]}, ${nameParts[0]}%`,
            );
          }

          nameMatches.forEach((match) => {
            visibilityClauses.push({ sender: { [Op.like]: match } });
            visibilityClauses.push({ endorsed: { [Op.like]: match } });
            visibilityClauses.push(
              sequelize.literal(
                `EXISTS (SELECT 1 FROM endorsements e WHERE e.letter_id = Letter.id AND e.endorsed_to LIKE ${sequelize.escape(match)})`,
              ),
            );
          });
        }
      }

      // 2. Main Query Construction
      // We use visibilityClauses to define what a user CAN see based on involvement.
      // But if a specific department is requested, it should act as a hard filter (AND).

      const departmentFilter = targetDeptId ? {
        [Op.or]: [
          { dept_id: targetDeptId },
          sequelize.literal(
            `EXISTS (SELECT 1 FROM letter_assignments la WHERE la.letter_id = Letter.id AND la.department_id = ${sequelize.escape(String(targetDeptId))})`
          )
        ]
      } : null;

      if (isSuperAdmin) {
        // SuperAdmins see everything by default
        if (departmentFilter) {
          where[Op.and] = [departmentFilter];
        } else {
          // Global view: no restrictions
          where[Op.and] = [sequelize.literal("1=1")];
        }
      } else {
        // For non-SuperAdmins, visibility is restricted by involvement OR their assigned department
        const involvementClause = visibilityClauses.length > 0 ? { [Op.or]: visibilityClauses } : null;
        
        let baselineVisibility;
        if (isDeptAdmin && myDeptId) {
           const deptAccess = {
             [Op.or]: [
               { dept_id: myDeptId },
               sequelize.literal(
                 `EXISTS (SELECT 1 FROM letter_assignments la WHERE la.letter_id = Letter.id AND la.department_id = ${sequelize.escape(String(myDeptId))})`
               )
             ]
           };
           baselineVisibility = involvementClause ? { [Op.or]: [deptAccess, involvementClause] } : deptAccess;
        } else if (involvementClause) {
           baselineVisibility = involvementClause;
        } else {
           // No involvement and no department access = see nothing
           baselineVisibility = { id: null };
        }

        where[Op.and] = [baselineVisibility];

        // If a specific department filter was also requested (e.g. from the deep dive/card click)
        if (departmentFilter) {
          where[Op.and].push(departmentFilter);
        }
      }

      const { count, rows } = await Letter.findAndCountAll({
        where,
        include: [
          "letterKind",
          "status",
          "attachment",
          "tray",
          {
            model: LetterAssignment,
            as: "assignments",
            include: ["step", "department"],
            required: false,
          },
          {
            model: Endorsement,
            as: "endorsements",
            required: false,
          },
        ],
        order: [["created_at", "DESC"]],
        limit: queryLimit,
        offset: offset,
        distinct: true,
        subQuery: false,
      });

      res.json({
        data: rows,
        total: count,
        page: parseInt(page),
        limit: queryLimit,
        totalPages: Math.ceil(count / queryLimit),
      });
    } catch (error) {
      console.error("[ERROR] LetterController.getAll (Detailed):", {
        message: error.message,
        stack: error.stack,
        query: req.query,
      });
      res.status(500).json({ error: "Letter lookup failed: " + error.message });
    }
  }

  static async getDepartmentLetters(req, res) {
    try {
      const { dept_id, page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const queryLimit = parseInt(limit);

      if (!dept_id || dept_id === "all") {
        return LetterController.getAll(req, res);
      }

      const { count, rows } = await Letter.findAndCountAll({
        where: {
          [Op.or]: [
            { dept_id: dept_id },
            { "$assignments.department_id$": dept_id },
          ],
        },
        include: [
          "letterKind",
          "status",
          "attachment",
          "tray",
          {
            model: LetterAssignment,
            as: "assignments",
            include: ["step", "department"],
            required: false,
          },
        ],
        order: [["created_at", "DESC"]],
        limit: queryLimit,
        offset: offset,
        distinct: true,
        subQuery: false,
      });

      res.json({
        data: rows,
        total: count,
        page: parseInt(page),
        limit: queryLimit,
        totalPages: Math.ceil(count / queryLimit),
      });
    } catch (error) {
      console.error("[ERROR] LetterController.getDepartmentLetters:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getPreviewIds(req, res) {
    try {
      const { prefix = "LMS", dept_id } = req.query;
      const now = new Date();
      const yearStr = now.getFullYear().toString();
      const shortYear = yearStr.slice(-2);
      const ymd =
        yearStr +
        (now.getMonth() + 1).toString().padStart(2, "0") +
        now.getDate().toString().padStart(2, "0");

      // New Format (Dept-based):
      // ATG[YY]-[DEPT_CODE]-00001 (per-year, per-department sequence)
      if (dept_id) {
        const dept = await Department.findByPk(dept_id, {
          attributes: ["dept_code"],
          raw: true,
        });
        const deptCodeRaw = dept?.dept_code ?? null;
        const deptCode = deptCodeRaw ? String(deptCodeRaw).trim().toUpperCase() : "";

        if (!deptCode) {
          return res.status(400).json({
            error: "Department code is required to generate a department-based reference code.",
          });
        }

        const atgPrefix = "ATG";
        const lastDeptYearEntry = await Letter.findOne({
          where: { lms_id: { [Op.like]: `${atgPrefix}${shortYear}-${deptCode}-%` } },
          order: [["lms_id", "DESC"]],
        });

        let annualSequence = 1;
        if (lastDeptYearEntry?.lms_id) {
          const parts = String(lastDeptYearEntry.lms_id).split("-");
          const lastSeq = parseInt(parts[parts.length - 1]);
          if (!Number.isNaN(lastSeq)) annualSequence = lastSeq + 1;
        }

        const lastDayEntry = await Letter.findOne({
          where: { entry_id: { [Op.like]: `${ymd}%` } },
          order: [["entry_id", "DESC"]],
        });

        let dailySequence = 1;
        if (lastDayEntry?.entry_id) {
          const lastSeqStr = String(lastDayEntry.entry_id).slice(-3);
          const lastSeq = parseInt(lastSeqStr);
          if (!Number.isNaN(lastSeq)) dailySequence = lastSeq + 1;
        }

        const lms_id = `${atgPrefix}${shortYear}-${deptCode}-${annualSequence.toString().padStart(5, "0")}`;
        const entry_id = `${ymd}${dailySequence.toString().padStart(3, "0")}`;

        return res.json({ lms_id, entry_id });
      }

      // Find counters via Max sequence for the specific prefix
      const lastYearEntry = await Letter.findOne({
        where: { lms_id: { [Op.like]: `${prefix}${shortYear}-%` } },
        order: [["lms_id", "DESC"]],
      });

      const lastDayEntry = await Letter.findOne({
        where: { entry_id: { [Op.like]: `${ymd}%` } },
        order: [["entry_id", "DESC"]],
      });

      let annualSequence = 1;
      if (lastYearEntry) {
        const parts = lastYearEntry.lms_id.split("-");
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

      const lms_id = `${prefix}${shortYear}-${annualSequence.toString().padStart(5, "0")}`;
      const entry_id = `${ymd}${dailySequence.toString().padStart(3, "0")}`;

      res.json({ lms_id, entry_id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const result = await Letter.findByPk(req.params.id, {
        include: [
          "letterKind",
          "status",
          "attachment",
          "tray",
          {
            model: LetterAssignment,
            as: "assignments",
            include: [
              { model: Department, as: "department" },
              { model: ProcessStep, as: "step" },
            ],
          },
          {
            model: LetterLog,
            as: "logs",
            include: [
              { model: User, as: "user" },
              { model: Department, as: "department" },
              { model: ProcessStep, as: "step" },
              { model: Status, as: "status" },
            ],
          },
          {
            model: User,
            as: "encoder",
            attributes: ["id", "first_name", "last_name", "email"],
          },
        ],
      });
      if (!result) return res.status(404).json({ error: "Not found" });
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
          "letterKind",
          "status",
          "attachment",
          "tray",
          {
            model: LetterAssignment,
            as: "assignments",
            include: ["step", "department"],
            required: false,
          },
        ],
      });
      if (!result) return res.status(404).json({ error: "Letter not found" });
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
        sender,
        summary,
        encoder_id,
        encoder,
        assigned_dept,
        kind,
        global_status,
        tray_id,
        attachment_id,
        letter_type,
        vemcode,
        aevm_number,
        evemnote,
        aevmnote,
        atgnote,
        dept_id,
        step_id,
      } = req.body;

      const isUUID = (val) => {
        if (!val) return false;
        const s = "" + val;
        const regex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return regex.test(s);
      };

      let validEncoderId = isUUID(encoder_id) ? encoder_id : null;

      if (
        !validEncoderId &&
        encoder &&
        typeof encoder === "string" &&
        encoder.trim() !== ""
      ) {
        // The frontend passes names like "Lastname, Firstname"
        const parts = encoder.split(",").map((p) => p.trim());
        if (parts.length >= 2) {
          const lName = parts[0];
          const fName = parts.slice(1).join(" ");
          const possibleUser = await User.findOne({
            where: {
              [Op.and]: [
                sequelize.where(
                  sequelize.fn("LOWER", sequelize.col("last_name")),
                  "LIKE",
                  `%${lName.toLowerCase()}%`,
                ),
                sequelize.where(
                  sequelize.fn("LOWER", sequelize.col("first_name")),
                  "LIKE",
                  `%${fName.toLowerCase()}%`,
                ),
              ],
            },
            transaction,
          });
          if (possibleUser) {
            validEncoderId = possibleUser.id;
          }
        }
      }

      console.log(
        `[LETTER_CREATE_DEBUG] Starting validation for: "${sender}" / "${summary}" | Resolved Encoder_ID: ${validEncoderId}`,
      );
      // 1. Core Validation
      if (!sender) {
        console.warn("[LETTER_CREATE_DEBUG] Validation Failed: Sender missing");
        if (transaction) await transaction.rollback();
        return res
          .status(418)
          .json({ error: "Sender name is required (418)." });
      }
      if (!summary) {
        console.warn(
          "[LETTER_CREATE_DEBUG] Validation Failed: Summary missing",
        );
        if (transaction) await transaction.rollback();
        return res
          .status(418)
          .json({ error: "Letter summary/regarding field is required (418)." });
      }
      console.log("[LETTER_CREATE_DEBUG] Core validation passed.");

      // Generate IDs
      const now = new Date();
      const yearStr = now.getFullYear().toString();
      const shortYear = yearStr.slice(-2);
      const ymd =
        yearStr +
        (now.getMonth() + 1).toString().padStart(2, "0") +
        now.getDate().toString().padStart(2, "0");

      // Find counters via Max sequence
      const lastYearEntry = await Letter.findOne({
        where: { lms_id: { [Op.like]: `LMS${shortYear}-%` } },
        order: [["lms_id", "DESC"]],
        transaction,
      });

      const lastDayEntry = await Letter.findOne({
        where: { entry_id: { [Op.like]: `${ymd}%` } },
        order: [["entry_id", "DESC"]],
        transaction,
      });

      console.log(
        `[LETTER_CREATE_DEBUG] ID Scan: Last Year=${lastYearEntry?.lms_id}, Last Day=${lastDayEntry?.entry_id}`,
      );

      let annualSequence = 1;
      if (lastYearEntry) {
        const parts = lastYearEntry.lms_id.split("-");
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
      let lms_id = `LMS${shortYear}-${annualSequence.toString().padStart(5, "0")}`;
      let entry_id = `${ymd}${dailySequence.toString().padStart(3, "0")}`;

      let attempts = 0;
      while (attempts < 50) {
        const existingLms = await Letter.findOne({
          where: { lms_id },
          transaction,
        });
        const existingEntry = await Letter.findOne({
          where: { entry_id },
          transaction,
        });

        if (!existingLms && !existingEntry) break;

        console.warn(
          `[LETTER_CREATE_DEBUG] ID Collision detected for ${lms_id}/${entry_id}. Retrying...`,
        );
        if (existingLms) {
          annualSequence++;
          lms_id = `LMS${shortYear}-${annualSequence.toString().padStart(5, "0")}`;
        }
        if (existingEntry) {
          dailySequence++;
          entry_id = `${ymd}${dailySequence.toString().padStart(3, "0")}`;
        }
        attempts++;
      }

      console.log(
        `[LETTER_CREATE] Final Assigned IDs: LMS_ID=${lms_id}, ENTRY_ID=${entry_id}`,
      );

      // Sanitize numeric fields to ensure they are valid integers or null
      const sanitizeInt = (val) => {
        if (val === "" || val === undefined || val === null) return null;
        const parsed = parseInt(val);
        return isNaN(parsed) ? null : parsed;
      };

      const incomingStatus = await Status.findOne({
        where: { status_name: "Incoming" },
        transaction,
      });
      const finalGlobalStatus =
        sanitizeInt(global_status) || incomingStatus?.id || 1;

      // Handle date with fallback
      let receivedDate = new Date();
      if (req.body.date_received && req.body.date_received !== "") {
        const parsedDate = new Date(req.body.date_received);
        if (!isNaN(parsedDate.getTime())) {
          receivedDate = parsedDate;
        }
      }

      const letterData = {
        lms_id: req.body.lms_id || lms_id,
        entry_id,
        date_received: receivedDate,
        sender: sender || "Unknown Sender",
        summary: summary || "No Summary Provided",
        kind: sanitizeInt(kind),
        global_status: finalGlobalStatus || 1,
        tray_id: sanitizeInt(tray_id) || null,
        attachment_id: sanitizeInt(attachment_id) || null,
        direction: req.body.direction || "Incoming",
        letter_type: letter_type || "Non-Confidential",
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
        processed_date: null,
      };

      console.log(
        `[LETTER_CREATE_DEBUG] Final Payload for DB: ${JSON.stringify(letterData, null, 2)}`,
      );

      const letter = await Letter.create(letterData, { transaction });
      console.log(`[LETTER_CREATE] Success! id ${letter.id}`);

      // Sync to Person table (for Sender autocomplete)
      const namesToSync = [];
      if (sender) {
        sender
          .split(";")
          .map((n) => n.trim())
          .filter((n) => n.length > 0 && n.includes(","))
          .forEach((n) => namesToSync.push(n));
      }
      if (req.body.endorse_to && req.body.endorse_to.trim().includes(",")) {
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
        finalStepIds = req.body.step_ids
          .map((id) => sanitizeInt(id))
          .filter((id) => id !== null);
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
              { step_name: { [Op.like]: "%Signature%" } },
              { step_name: { [Op.like]: "%Endorsement%" } },
            ],
          },
          transaction,
        });

        let fallbackId = sigStep?.id;
        if (!fallbackId) {
          const firstStep = await ProcessStep.findOne({
            where: { dept_id: validAssignedDept },
            transaction,
          });
          fallbackId = firstStep?.id;
        }
        if (fallbackId) finalStepIds = [fallbackId];
      }

      if (finalStepIds.length > 0) {
        for (const sid of finalStepIds) {
          const stepObj = await ProcessStep.findByPk(sid, { transaction });
          const stepDeptId = stepObj?.dept_id || validAssignedDept;

          await LetterAssignment.create(
            {
              letter_id: letter.id,
              department_id: stepDeptId,
              step_id: sid,
              assigned_by: targetEncoderId,
              status_id: finalGlobalStatus,
            },
            { transaction },
          );

          await LetterLog.create(
            {
              letter_id: letter.id,
              user_id: targetEncoderId,
              action_type: "Created",
              department_id: stepDeptId,
              step_id: sid,
              status_id: finalGlobalStatus || 1,
              metadata: { marginal_note: req.body.marginal_note },
              log_details: `Letter created and initially assigned to ${stepObj?.step_name || "Workflow Step"}.`,
            },
            { transaction },
          );
        }
      } else {
        await LetterLog.create(
          {
            letter_id: letter.id,
            user_id: targetEncoderId,
            action_type: "Created",
            department_id: validAssignedDept || targetDeptId,
            log_details: `Letter created with no initial workflow step assigned.`,
          },
          { transaction },
        );

        // Telegram Notification for Guest or No-Step letters
        if (TelegramService && letter) {
          setImmediate(async () => {
            try {
              const movementText = TelegramService.buildMovementText(
                letter,
                "Incoming / Guest",
                "Letter Encoded",
              );
              const recipients = await User.findAll({
                where: { role: { [Op.in]: ["VIP", "Administrator"] } },
              });

              if (
                letter.encoder_id &&
                !recipients.some((r) => r.id === letter.encoder_id)
              ) {
                const encoder = await User.findByPk(letter.encoder_id);
                if (encoder && !TelegramService.isVipOnly(encoder))
                  recipients.push(encoder);
              }

              const recipientChatIds = await TelegramService.getChatIdsForUsers(
                recipients,
                Person,
                User,
              );
              const senderChatIds = await TelegramService.getChatIdsForSenders(
                letter.sender,
                Person,
              );
              const chatIds = [
                ...new Set([...recipientChatIds, ...senderChatIds]),
              ];

              for (const chatId of chatIds) {
                const replyMarkup = TelegramService.buildMovementReplyMarkup(
                  letter.id,
                  { allowComment: false, allowAcknowledge: true },
                );
                await TelegramService.sendMessage(
                  chatId,
                  movementText,
                  replyMarkup,
                );
              }
            } catch (bgErr) {
              console.error(
                "Background Telegram error (Controller create):",
                bgErr.message,
              );
            }
          });
        }
      }

      await transaction.commit();
      res.status(201).json(letter);
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      console.error("[LETTER_CREATE_DEBUG] DATABASE REJECTED SAVE:", error);

      try {
        const fs = require("fs");
        const logMsg = `[${new Date().toISOString()}] ERROR: ${error.message}\nSTACK: ${error.stack}\nBODY: ${JSON.stringify(req.body, null, 2)}\nDATA: ${JSON.stringify(error.parent || {}, null, 2)}\n\n`;
        fs.appendFileSync("./backend_error.log", logMsg);
      } catch (e) {}

      res.status(400).json({
        error: `Database Rejection: ${error.message}`,
        details: error.name,
        stack: error.stack,
        fullError: error,
      });
    }
  }

  static async update(req, res) {
    let transaction;
    try {
      transaction = await Letter.sequelize.transaction();
      const letter = await Letter.findByPk(req.params.id, { transaction });
      if (!letter) {
        await transaction.rollback();
        return res.status(404).json({ error: "Not found" });
      }

      const oldStatusId = letter.global_status;
      const updates = { ...req.body };

      // Normalize internal IDs
      if (Object.prototype.hasOwnProperty.call(updates, "kind")) {
        const parsed =
          updates.kind === "" ||
          updates.kind === undefined ||
          updates.kind === null
            ? null
            : parseInt(updates.kind);
        updates.kind = Number.isNaN(parsed) ? null : parsed;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "tray_id")) {
        const parsed =
          updates.tray_id === "" ||
          updates.tray_id === undefined ||
          updates.tray_id === null
            ? null
            : parseInt(updates.tray_id);
        updates.tray_id = Number.isNaN(parsed) ? null : parsed;
      }

      const newStatusId =
        updates.global_status !== undefined
          ? updates.global_status === ""
            ? null
            : parseInt(updates.global_status)
          : oldStatusId;

      await letter.update(updates, { transaction });

      // Create log if status changed
      if (newStatusId !== oldStatusId) {
        const newStatus = await Status.findByPk(newStatusId, { transaction });
        await LetterLog.create(
          {
            letter_id: letter.id,
            user_id: req.body.user_id || null, // Best effort for user id
            action_type: newStatus?.status_name || "Status Updated",
            status_id: newStatusId,
            log_details: `Status changed to ${newStatus?.status_name || "Unknown"}`,
          },
          { transaction },
        );
      }

      await transaction.commit();
      res.json(letter);
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error("[LETTER_UPDATE_ERROR]:", error);
      res.status(400).json({ error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const letter = await Letter.findByPk(req.params.id);
      if (!letter) return res.status(404).json({ error: "Not found" });
      await letter.destroy();
      res.json({ message: "Deleted" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async bulkCreateEmpty(req, res) {
    let transaction;
    try {
      transaction = await sequelize.transaction();
      const { count = 1, encoder_id, dept_id } = req.body;
      const numCount = parseInt(count);

      if (isNaN(numCount) || numCount <= 0) {
        return res.status(400).json({ error: "Invalid count" });
      }

      const incomingStatus = await Status.findOne({
        where: { status_name: "Incoming" },
        transaction,
      });
      const finalGlobalStatus = incomingStatus?.id || 1;
      const validEncoderId = encoder_id || null;
      const targetDeptId = dept_id || null;

      const createdLetters = [];

      for (let i = 0; i < numCount; i++) {
        const now = new Date();
        const yearStr = now.getFullYear().toString();
        const shortYear = yearStr.slice(-2);
        const ymd =
          yearStr +
          (now.getMonth() + 1).toString().padStart(2, "0") +
          now.getDate().toString().padStart(2, "0");

        const lastYearEntry = await Letter.findOne({
          where: { lms_id: { [Op.like]: `LMS${shortYear}-%` } },
          order: [["lms_id", "DESC"]],
          transaction,
        });

        const lastDayEntry = await Letter.findOne({
          where: { entry_id: { [Op.like]: `${ymd}%` } },
          order: [["entry_id", "DESC"]],
          transaction,
        });

        let annualSequence = 1;
        if (lastYearEntry) {
          const parts = lastYearEntry.lms_id.split("-");
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

        let lms_id = `LMS${shortYear}-${annualSequence.toString().padStart(5, "0")}`;
        let entry_id = `${ymd}${dailySequence.toString().padStart(3, "0")}`;

        let attempts = 0;
        while (attempts < 50) {
          const existingLms = await Letter.findOne({
            where: { lms_id },
            transaction,
          });
          const existingEntry = await Letter.findOne({
            where: { entry_id },
            transaction,
          });
          if (!existingLms && !existingEntry) break;
          if (existingLms) {
            annualSequence++;
            lms_id = `LMS${shortYear}-${annualSequence.toString().padStart(5, "0")}`;
          }
          if (existingEntry) {
            dailySequence++;
            entry_id = `${ymd}${dailySequence.toString().padStart(3, "0")}`;
          }
          attempts++;
        }

        const letter = await Letter.create(
          {
            lms_id,
            entry_id,
            date_received: now,
            sender: "",
            summary: "",
            global_status: finalGlobalStatus,
            encoder_id: validEncoderId,
            dept_id: targetDeptId,
            direction: "Incoming",
            letter_type: "Non-Confidential",
            show_atg: false,
          },
          { transaction },
        );

        await LetterLog.create(
          {
            letter_id: letter.id,
            user_id: validEncoderId,
            action_type: "Created",
            department_id: targetDeptId,
            log_details: `Urgent empty entry created for quick-start.`,
          },
          { transaction },
        );

        createdLetters.push(letter);
      }

      await transaction.commit();
      res.status(201).json(createdLetters);
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error("[BULK_CREATE_EMPTY_ERROR]:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = LetterController;
