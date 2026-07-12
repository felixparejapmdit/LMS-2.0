const fs = require("fs");
const path = require("path");

const SETTINGS_FILE = path.join(__dirname, "../config/app_settings.json");

const DEFAULT_APP_SETTINGS = {
  favicon: null,
  sidebar_logo: null,
  login_logo: null,
  system_theme: "default",
  reference_code_prefix: "LMS",
  reference_code_department_mode: true,
};

const sanitizeReferencePrefix = (value, fallback = DEFAULT_APP_SETTINGS.reference_code_prefix) => {
  const cleaned = String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return cleaned || fallback;
};

const coerceBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  return fallback;
};

const normalizeAppSettings = (raw = {}) => {
  const source = raw && typeof raw === "object" ? raw : {};

  return {
    ...DEFAULT_APP_SETTINGS,
    ...source,
    reference_code_prefix: sanitizeReferencePrefix(
      source.reference_code_prefix,
      DEFAULT_APP_SETTINGS.reference_code_prefix,
    ),
    reference_code_department_mode: coerceBoolean(
      source.reference_code_department_mode,
      DEFAULT_APP_SETTINGS.reference_code_department_mode,
    ),
  };
};

const readAppSettings = () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
      return normalizeAppSettings(JSON.parse(raw));
    }
  } catch (error) {
    console.error("Failed to read app settings", error);
  }

  return { ...DEFAULT_APP_SETTINGS };
};

const writeAppSettings = (settings) => {
  const normalized = normalizeAppSettings(settings);
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
};

const getReferenceCodePrefix = () =>
  sanitizeReferencePrefix(readAppSettings().reference_code_prefix);

const isReferenceCodeDepartmentModeEnabled = () =>
  readAppSettings().reference_code_department_mode !== false;

module.exports = {
  SETTINGS_FILE,
  DEFAULT_APP_SETTINGS,
  sanitizeReferencePrefix,
  normalizeAppSettings,
  readAppSettings,
  writeAppSettings,
  getReferenceCodePrefix,
  isReferenceCodeDepartmentModeEnabled,
};
