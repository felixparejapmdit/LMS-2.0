const axios = require("axios");
const { Op } = require("sequelize");
const { Letter, Department, RefSectionRegistry } = require("../models/associations");
const SectionService = require("./SectionService");
const {
  getReferenceCodePrefix,
  isReferenceCodeDepartmentModeEnabled,
  sanitizeReferencePrefix,
} = require("./appSettingsService");

const LEGACY_LETTERS_API_URL =
  process.env.LEGACY_LETTERS_API_URL ||
  "http://172.18.162.84/api/letters_detailed.php";
const LEGACY_LETTERS_PAGE_LIMIT = Number.parseInt(
  process.env.LEGACY_LETTERS_PAGE_LIMIT || "500",
  10,
);
const LEGACY_LETTERS_TIMEOUT_MS = Number.parseInt(
  process.env.LEGACY_LETTERS_TIMEOUT_MS || "2000",
  10,
);

const escapeRegExp = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findLatestLegacyReferenceCode = (rows, { prefix, shortYear }) => {
  const exactPattern = new RegExp(
    `^${escapeRegExp(prefix)}${shortYear}-(\\d+)$`,
    "i",
  );
  const genericPattern = new RegExp(
    `^([A-Z0-9]+)${shortYear}-(\\d+)$`,
    "i",
  );

  let exactMatch = null;
  let fallbackMatch = null;

  for (const row of rows) {
    const candidates = [
      row?.atg_id,
      row?.lms_id,
      row?.entry_id,
      row?.id,
    ];

    for (const rawCandidate of candidates) {
      const candidate = (rawCandidate ?? "").toString().trim();
      if (!candidate) continue;

      const exact = candidate.match(exactPattern);
      if (exact) {
        const parsed = parseInt(exact[1], 10);
        if (Number.isNaN(parsed)) continue;
        if (!exactMatch || parsed > exactMatch.sequence) {
          exactMatch = { prefix, sequence: parsed };
        }
        continue;
      }

      const generic = candidate.match(genericPattern);
      if (!generic) continue;

      const parsed = parseInt(generic[2], 10);
      if (Number.isNaN(parsed)) continue;
      const detectedPrefix = generic[1].toUpperCase();
      if (!fallbackMatch || parsed > fallbackMatch.sequence) {
        fallbackMatch = { prefix: detectedPrefix, sequence: parsed };
      }
    }
  }

  const winner = exactMatch || fallbackMatch;
  if (!winner) return null;

  return `${winner.prefix}${shortYear}-${(winner.sequence + 1)
    .toString()
    .padStart(5, "0")}`;
};

const getNowParts = (now = new Date()) => {
  const yearStr = now.getFullYear().toString();
  return {
    yearStr,
    shortYear: yearStr.slice(-2),
    ymd:
      yearStr +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0"),
  };
};

const getDailyEntryId = async (transaction = null, now = new Date()) => {
  const { ymd } = getNowParts(now);
  const lastDayEntry = await Letter.findOne({
    where: { entry_id: { [Op.like]: `${ymd}%` } },
    order: [["entry_id", "DESC"]],
    transaction,
  });

  let dailySequence = 1;
  if (lastDayEntry?.entry_id) {
    const lastSeqStr = lastDayEntry.entry_id.slice(-3);
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!Number.isNaN(lastSeq)) dailySequence = lastSeq + 1;
  }

  return `${ymd}${dailySequence.toString().padStart(3, "0")}`;
};

const getGlobalReferenceCode = async ({
  prefix,
  shortYear,
  transaction = null,
}) => {
  const searchPrefix = `${prefix}${shortYear}-00`;
  const lastGlobalEntry = await Letter.findOne({
    where: { lms_id: { [Op.like]: `${searchPrefix}%` } },
    order: [["lms_id", "DESC"]],
    transaction,
  });

  let sequence = 1;
  if (lastGlobalEntry?.lms_id) {
    const parts = lastGlobalEntry.lms_id.split("-");
    if (parts.length > 1) {
      const lastSeq = parseInt(parts[1], 10);
      if (!Number.isNaN(lastSeq)) sequence = lastSeq + 1;
    }
  }

  return `${prefix}${shortYear}-${sequence.toString().padStart(5, "0")}`;
};

const getLegacyGlobalReferenceCode = async ({
  prefix,
  shortYear,
}) => {
  try {
    const response = await axios.get(LEGACY_LETTERS_API_URL, {
      params: {
        page: 1,
        limit: Number.isFinite(LEGACY_LETTERS_PAGE_LIMIT)
          ? LEGACY_LETTERS_PAGE_LIMIT
          : 500,
        search: "",
      },
      timeout: Number.isFinite(LEGACY_LETTERS_TIMEOUT_MS)
        ? LEGACY_LETTERS_TIMEOUT_MS
        : 2000,
    });

    const rows = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data?.letters)
          ? response.data.letters
          : [];

    const legacyCode = findLatestLegacyReferenceCode(rows, {
      prefix,
      shortYear,
    });

    if (legacyCode) return legacyCode;
  } catch (error) {
    console.warn(
      "[REFERENCE_CODE] Legacy source unavailable, falling back to live data:",
      error?.message || error,
    );
  }

  return null;
};

const getDepartmentReferenceCode = async ({
  deptId,
  prefix,
  shortYear,
  transaction = null,
}) => {
  const dept = await Department.findByPk(deptId, { transaction });
  if (!dept) return null;

  if (dept.group_id === 3) {
    const usage = await SectionService.getActiveSection(deptId, transaction);
    let { sequence, section_code } = await SectionService.findNextAvailableSequence(
      deptId,
      prefix,
      usage.section_code,
      3,
      transaction,
    );

    if (sequence >= 1000) {
      const nextAvailable = await RefSectionRegistry.findOne({
        where: { status: "AVAILABLE" },
        order: [["section_code", "ASC"]],
        transaction,
      });
      section_code = nextAvailable ? nextAvailable.section_code : "XX";
      sequence = 1;
    }

    return `${prefix}${shortYear}-${section_code}${sequence.toString().padStart(3, "0")}`;
  }

  const deptPrefix = dept.dept_code || prefix;
  const { sequence } = await SectionService.findNextAvailableSequence(
    deptId,
    deptPrefix,
    "",
    5,
    transaction,
  );

  return `${deptPrefix}${shortYear}-${sequence.toString().padStart(5, "0")}`;
};

const getPreviewReferenceCode = async ({
  deptId = null,
  prefixOverride = null,
  transaction = null,
} = {}) => {
  const now = new Date();
  const { shortYear } = getNowParts(now);
  const entry_id = await getDailyEntryId(transaction, now);
  const prefix = sanitizeReferencePrefix(
    prefixOverride,
    getReferenceCodePrefix(),
  );

  if (!isReferenceCodeDepartmentModeEnabled()) {
    const legacyCode = await getLegacyGlobalReferenceCode({
      prefix,
      shortYear,
    });
    return {
      lms_id:
        legacyCode ||
        (await getGlobalReferenceCode({ prefix, shortYear, transaction })),
      entry_id,
    };
  }

  if (!deptId || deptId === "null" || deptId === "undefined" || deptId === "") {
    return {
      lms_id: null,
      entry_id,
    };
  }

  return {
    lms_id: await getDepartmentReferenceCode({
      deptId,
      prefix,
      shortYear,
      transaction,
    }),
    entry_id,
  };
};

const getCreateReferenceCode = async ({
  deptId = null,
  transaction = null,
} = {}) => {
  const now = new Date();
  const { shortYear } = getNowParts(now);
  const entry_id = await getDailyEntryId(transaction, now);
  const prefix = getReferenceCodePrefix();

  if (!isReferenceCodeDepartmentModeEnabled()) {
    const legacyCode = await getLegacyGlobalReferenceCode({
      prefix,
      shortYear,
    });
    return {
      lms_id:
        legacyCode ||
        (await getGlobalReferenceCode({ prefix, shortYear, transaction })),
      entry_id,
    };
  }

  if (!deptId || deptId === "null" || deptId === "undefined" || deptId === "") {
    return {
      lms_id: entry_id,
      entry_id,
    };
  }

  return {
    lms_id: await getDepartmentReferenceCode({
      deptId,
      prefix,
      shortYear,
      transaction,
    }),
    entry_id,
  };
};

module.exports = {
  getNowParts,
  getDailyEntryId,
  getGlobalReferenceCode,
  getLegacyGlobalReferenceCode,
  getDepartmentReferenceCode,
  getPreviewReferenceCode,
  getCreateReferenceCode,
};
