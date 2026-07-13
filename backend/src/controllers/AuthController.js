const {
  User,
  Role,
  RolePermission,
  Department,
  SystemPage,
} = require("../models/associations");
const axios = require("axios");
const http = require("http");
const https = require("https");
const sequelize = require("../config/db");
const { Sequelize, Op } = require("sequelize");
const argon2 = require("argon2");

const DIRECTUS_URL =
  process.env.DIRECTUS_INTERNAL_URL || "http://localhost:8055";
const PERMS_CACHE_TTL_MS = Number.parseInt(
  process.env.PERMS_CACHE_TTL_MS || "600000",
  10,
);
const permsCache = new Map();

const directusClient = axios.create({
  baseURL: DIRECTUS_URL,
  timeout: 10000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

let cachedPages = null;
let cachedPagesTimestamp = 0;
const PAGES_CACHE_TTL = 3600000;

// Heuristic cache to avoid "try email then username" every login.
// Most installs treat Directus "email" as the LMS username, so default to username first.
const directusLoginHint = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientDirectusError = (error) => {
  const status = error?.response?.status;
  const code = String(error?.code || "").toUpperCase();
  return (
    [429, 500, 502, 503, 504].includes(status) ||
    ["ECONNREFUSED", "ECONNABORTED", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND"].includes(code)
  );
};

const retryDirectusRequest = async (
  operation,
  { attempts = 3, baseDelayMs = 400, label = "Directus request" } = {},
) => {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const status = error?.response?.status ?? error?.code ?? "unknown";
      const shouldRetry =
        attempt < attempts && isTransientDirectusError(error);

      if (!shouldRetry) throw error;

      console.warn(
        `[AUTH] ${label} attempt ${attempt} failed (${status}); retrying...`,
      );
      await sleep(baseDelayMs * attempt);
    }
  }
  throw lastError;
};

const ensureRolePermissionsForAllPages = async (
  roleId,
  roleName = "",
  systemPages = null,
) => {
  if (!roleId) return;

  const pages =
    Array.isArray(systemPages) && systemPages.length > 0
      ? systemPages
      : await SystemPage.findAll({ attributes: ["page_id"] });

  const pageIds = pages.map((p) => p.page_id).filter(Boolean);
  if (pageIds.length === 0) return;

  const existing = await RolePermission.findAll({
    where: { role_id: roleId },
    attributes: ["page_name"],
  });
  const existingPageNames = new Set(existing.map((r) => r.page_name));
  const missingPages = pageIds.filter(
    (pageId) => !existingPageNames.has(pageId),
  );
  // Force-update essential pages for existing roles to ensure they aren't locked out of landing pages.
  const corePages = ["home", "profile", "settings"];
  const rName = String(roleName || "").toUpperCase();
  const IS_ADMIN = [
    "ADMINISTRATOR",
    "ADMIN",
    "SUPER ADMIN",
    "DEVELOPER",
    "ROOT",
  ].includes(rName);
  if (IS_ADMIN) {
    corePages.push("role-matrix", "dept-matrix");
  }

  await RolePermission.update(
    { can_view: true },
    {
      where: {
        role_id: roleId,
        page_name: { [Op.in]: corePages },
        can_view: false,
      },
    },
  );

  if (missingPages.length === 0) return false;

  const toCreate = missingPages.map((pageId) => {
    // Default 'home' to accessible for all roles so they can at least land on the dashboard.
    // Also default specific landing pages based on known role names to avoid immediate "Access Denied" on login.
    let defaultView =
      pageId === "home" || pageId === "profile" || pageId === "settings";

    const rName = String(roleName || "").toUpperCase();
    if (rName.includes("ENCODER") && pageId === "inbox") defaultView = true;
    if (rName.includes("USER") && pageId === "letter-tracker")
      defaultView = true;
    if (rName.includes("VIP") && pageId === "vip-view") defaultView = true;

    return {
      role_id: roleId,
      page_name: pageId,
      can_view: defaultView,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_special: false,
      field_permissions: withDefaultFieldPermissions(pageId, {}),
    };
  });

  await RolePermission.bulkCreate(toCreate, { ignoreDuplicates: true });
  return true;
};

const getCachedPerms = (roleId) => {
  if (
    !roleId ||
    !Number.isFinite(PERMS_CACHE_TTL_MS) ||
    PERMS_CACHE_TTL_MS <= 0
  )
    return null;
  const cached = permsCache.get(roleId);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    permsCache.delete(roleId);
    return null;
  }
  return cached.value;
};

const setCachedPerms = (roleId, value) => {
  if (
    !roleId ||
    !Number.isFinite(PERMS_CACHE_TTL_MS) ||
    PERMS_CACHE_TTL_MS <= 0
  )
    return;
  permsCache.set(roleId, { value, expiresAt: Date.now() + PERMS_CACHE_TTL_MS });
};

const PAGE_FIELD_PRESETS = {
  home: ["refresh_button", "quick_new_letter_button", "quick_trays_button"],
  "vip-view": [
    "step_selector",
    "pdf_button",
    "comment_box",
    "submit_button",
    "edit_button",
    "delete_button",
    "logout_button",
  ],
  "new-letter": [
    "sender_field",
    "summary_field",
    "status_dropdown",
    "department_selector",
    "attachment_selector",
    "attachment_upload",
    "kind_dropdown",
    "tray_selector",
    "save_button",
    "print_qr_button",
  ],
  inbox: [
    "search",
    "refresh_button",
    "tab_filter",
    "tray_selector",
    "tab_signature",
    "tab_review",
    "tab_atg_note",
    "tab_vem",
    "tab_avem",
    "tab_pending",
    "tab_hold",
    "tab_empty_entry",
  ],
  outbox: ["search", "refresh_button"],
  spam: [
    "search",
    "submit_button",
    "clear_button",
    "save_button",
    "refresh_button",
  ],
  "master-table": [
    "search",
    "edit_button",
    "delete_button",
    "status_dropdown",
    "department_selector",
    "step_selector",
    "pdf_button",
    "save_button",
    "attachment_upload",
    "endorse_button",
    "track_button",
    "print_qr_button",
    "refresh_button",
  ],
  "letters-with-comments": [
    "search",
    "pdf_button",
    "tab_filter",
    "refresh_button",
  ],
  "letter-tracker": [
    "search",
    "pdf_button",
    "track_button",
    "print_qr_button",
    "refresh_button",
  ],
  "upload-pdf": [
    "attachment_upload",
    "save_button",
    "pdf_button",
    "delete_button",
    "view_toggle",
  ],
  "guest-send-letter": [
    "sender_field",
    "encoder_field",
    "summary_field",
    "department_selector",
    "attachment_selector",
    "kind_dropdown",
    "attachment_upload",
    "submit_button",
    "clear_button",
    "print_qr_button",
  ],
  endorsements: [
    "search",
    "print_button",
    "delete_button",
    "view_button",
    "refresh_button",
  ],
  settings: [
    "save_button",
    "layout_selector",
    "font_selector",
    "app_customization",
    "reference_code_prefix",
    "reference_code_mode",
    "system_theme",
    "favicon_upload",
    "sidebar_logo_upload",
    "login_logo_upload",
    "apply_system_settings_button",
  ],
  attachments: [
    "add_button",
    "edit_button",
    "delete_button",
    "save_button",
    "refresh_button",
    "view_toggle",
  ],
  persons: [
    "add_button",
    "edit_button",
    "delete_button",
    "save_button",
    "refresh_button",
    "view_toggle",
  ],
  "data-import": ["persons_import_button", "users_import_button"],
  departments: [
    "add_button",
    "edit_button",
    "delete_button",
    "save_button",
    "refresh_button",
    "view_toggle",
  ],
  "letter-kinds": [
    "add_button",
    "edit_button",
    "delete_button",
    "save_button",
    "refresh_button",
    "view_toggle",
  ],
  statuses: [
    "add_button",
    "edit_button",
    "delete_button",
    "save_button",
    "refresh_button",
    "view_toggle",
  ],
  "process-steps": [
    "add_button",
    "edit_button",
    "delete_button",
    "save_button",
    "refresh_button",
    "view_toggle",
  ],
  trays: [
    "add_button",
    "edit_button",
    "delete_button",
    "save_button",
    "refresh_button",
    "view_toggle",
    "navigate_button",
  ],
  users: [
    "search",
    "add_button",
    "edit_button",
    "delete_button",
    "save_button",
    "refresh_button",
    "view_toggle",
    "role_filter",
    "department_filter",
    "avatar_upload",
  ],
  "role-matrix": [
    "search",
    "save_button",
    "edit_field",
    "allow_all_button",
    "restrict_button",
    "role_selector",
    "department_filter",
  ],
  setup: [
    "department_field",
    "dept_code_field",
    "template_selector",
    "add_button",
    "delete_button",
    "submit_button",
    "next_button",
    "back_button",
  ],
  "letter-detail": ["pdf_button", "back_button"],
  "department-letters": [
    "back_button",
    "search",
    "refresh_button",
    "tab_filter",
    "tray_selector",
  ],
  profile: ["save_button", "password_field", "avatar_upload", "username_field"],
  "audit-logs": ["search", "refresh_button"],
  "dept-matrix": [
    "search",
    "save_button",
    "edit_field",
    "allow_all_button",
    "restrict_button",
    "role_selector",
  ],
  roles: [
    "add_button",
    "edit_button",
    "delete_button",
    "save_button",
    "refresh_button",
  ],
  sections: [
    "add_button",
    "edit_button",
    "delete_button",
    "save_button",
    "refresh_button",
    "view_toggle",
  ],
  trash: ["restore_button", "delete_button", "search", "refresh_button"],
  "legacy-data": ["search", "refresh_button", "pdf_button"],
  "vem-resumen": [
    "print_button",
    "add_button",
    "forward_button",
    "back_button",
    "scan_qr_button",
  ],
  "aevm-resumen": [
    "print_button",
    "add_button",
    "forward_button",
    "back_button",
    "scan_qr_button",
  ],
  resumen: [
    "print_button",
    "add_button",
    "forward_button",
    "back_button",
    "scan_qr_button",
  ],
};

const withDefaultFieldPermissions = (pageName, raw = {}) => {
  let data = raw;
  try {
    if (typeof raw === "string") data = JSON.parse(raw);
  } catch (e) {
    data = {};
  }

  const keys = PAGE_FIELD_PRESETS[pageName] || ["search", "save_button"];
  const normalized = {};
  const source = data && typeof data === "object" ? data : {};

  for (const key of keys) {
    normalized[key] = Object.prototype.hasOwnProperty.call(source, key)
      ? source[key]
      : true;
  }
  return normalized;
};

const normalizePermissions = (perms) =>
  perms.map((record) => {
    const data = record.toJSON();
    return {
      ...data,
      field_permissions: withDefaultFieldPermissions(
        data.page_name,
        data.field_permissions,
      ),
    };
  });

class AuthController {
  static async login(req, res) {
    const startTime = Date.now();
    const timings = {};
    const lap = (name) => {
      timings[name] = Date.now() - startTime;
    };

    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Username and password are required" });
      }

      // STEP 1: PARALLEL LOCAL LOOKUP
      const [user, systemPages] = await Promise.all([
        User.findOne({
          where: { [Op.or]: [{ username }, { email: username }] },
          include: ["roleData", "department"],
        }),
        !cachedPages || Date.now() - cachedPagesTimestamp > PAGES_CACHE_TTL
          ? SystemPage.findAll({ attributes: ["page_id"] })
          : Promise.resolve(cachedPages),
      ]);

      lap("Local Resolve");

      if (!user) {
        return res
          .status(401)
          .json({ error: "Invalid credentials (User not found)" });
      }

      // Update page cache
      if (systemPages !== cachedPages) {
        cachedPages = systemPages;
        cachedPagesTimestamp = Date.now();
      }

      // STEP 2: LOCAL PASSWORD VERIFICATION (FAST PATH)
      let isPasswordValid = false;
      try {
        isPasswordValid = await argon2.verify(user.password, password);
        lap("Local Pwd Check");
      } catch (err) {
        console.error("[LOGIN] Argon2 Error:", err);
      }

      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // STEP 3: FETCH PERMISSIONS (PARALLEL)
      let normalizedPerms = getCachedPerms(user.role);
      const permissionsPromise = !normalizedPerms
        ? RolePermission.findAll({ where: { role_id: user.role } })
        : Promise.resolve(null);

      // STEP 4: WAIT FOR PERMISSIONS
      const permsResult = await permissionsPromise;

      if (permsResult) {
        normalizedPerms = normalizePermissions(permsResult);
        setCachedPerms(user.role, normalizedPerms);
        lap("Permission Fetch");
      } else {
        lap("Permission Cache Hit");
      }

      // Ensure every SystemPage has an explicit permission row for this role.
      // This prevents "missing row" pages from defaulting to open/unprotected.
      const ensured = await ensureRolePermissionsForAllPages(
        user.role,
        user.roleData?.name,
        systemPages,
      ).catch((syncError) => {
        console.warn(
          "[LOGIN] Permission sync skipped:",
          syncError?.message || syncError,
        );
        return false;
      });
      if (ensured) {
        permsCache.delete(user.role);
        normalizedPerms = normalizePermissions(
          await RolePermission.findAll({ where: { role_id: user.role } }),
        );
        setCachedPerms(user.role, normalizedPerms);
      }
      lap("Data Prepared");

      // Background update
      User.update({ islogin: true }, { where: { id: user.id } }).catch(
        () => {},
      );

      // Audit Log: record login event
      const AuditLogController = require("./AuditLogController");
      const ua = req.headers["user-agent"] || "";
      const ipAddr =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.ip ||
        req.connection?.remoteAddress ||
        "unknown";
      // Parse browser and OS from user-agent
      const parseBrowser = (uaStr) => {
        if (uaStr.includes("Edg/")) return "Edge";
        if (uaStr.includes("Chrome/")) return "Chrome";
        if (uaStr.includes("Firefox/")) return "Firefox";
        if (uaStr.includes("Safari/") && !uaStr.includes("Chrome"))
          return "Safari";
        if (uaStr.includes("Opera") || uaStr.includes("OPR/")) return "Opera";
        return "Other";
      };
      const parseOS = (uaStr) => {
        if (uaStr.includes("Windows NT 10")) return "Windows 10/11";
        if (uaStr.includes("Windows")) return "Windows";
        if (uaStr.includes("Mac OS X")) return "macOS";
        if (uaStr.includes("Android")) return "Android";
        if (uaStr.includes("iPhone") || uaStr.includes("iPad")) return "iOS";
        if (uaStr.includes("Linux")) return "Linux";
        return "Unknown";
      };
      AuditLogController.logLogin({
        user_id: user.id,
        user_name:
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.username,
        ip_address: ipAddr,
        browser: parseBrowser(ua),
        device_os: parseOS(ua),
        details: ua.substring(0, 255),
      }).catch(() => {});

      console.log(
        `[LOGIN] Fast-path successful for ${user.username} in ${Date.now() - startTime}ms. Directus: DEFERRED`,
      );

      return res.json({
        success: true,
        user: {
          ...user.get({ plain: true }),
          systemPages: systemPages.map((p) => p.page_id),
        },
        permissions: normalizedPerms || [], // ROOT LEVEL as expected by frontend
        directus_auth: null,
        directus_deferred: true,
        timings,
      });
    } catch (error) {
      console.error(`[LOGIN] Critical Failure:`, error.message);
      res.status(500).json({ error: "Authentication service error" });
    }
  }

  static async directusLogin(req, res) {
    const startTime = Date.now();
    const timings = {};
    const lap = (name) => {
      timings[name] = Date.now() - startTime;
    };

    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Username and password are required" });
      }

      const user = await User.findOne({
        where: { [Op.or]: [{ username }, { email: username }] },
        include: ["roleData", "department"],
      });

      lap("Local Resolve");

      if (!user) {
        return res
          .status(401)
          .json({ error: "Invalid credentials (User not found)" });
      }

      let isPasswordValid = false;
      try {
        isPasswordValid = await argon2.verify(user.password, password);
        lap("Local Pwd Check");
      } catch (err) {
        console.error("[LOGIN] Argon2 Error:", err);
      }

      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const directusStart = Date.now();
      const hint = directusLoginHint.get(user.id) || "email";
      const candidates = [];

      const pushCandidate = (value) => {
        const candidate = (value ?? "").toString().trim();
        if (candidate) candidates.push(candidate);
      };

      if (hint === "email") {
        pushCandidate(user.email);
        pushCandidate(user.username);
      } else {
        pushCandidate(user.username);
        pushCandidate(user.email);
      }

      const uniq = candidates
        .filter(Boolean)
        .filter((v, idx, arr) => arr.indexOf(v) === idx);

      let sawInvalidCredentials = false;
      let sawNonAuthError = false;

      if (uniq.length === 0) {
        console.error(
          `[AUTH] Directus Login failed: No valid email candidates found for user ${user.username}`,
        );
        sawInvalidCredentials = true;
      }

      for (const identifier of uniq) {
        try {
          console.log(
            `[AUTH] Attempting Directus authentication for ${identifier}...`,
          );
          const response = await retryDirectusRequest(
            () =>
              directusClient.post("/auth/login", {
                email: identifier,
                password: password,
              }),
            {
              attempts: 3,
              baseDelayMs: 500,
              label: `Directus auth for ${identifier}`,
            },
          );
          timings["Directus Login"] = Date.now() - directusStart;
          directusLoginHint.set(
            user.id,
            identifier === user.email ? "email" : "username",
          );
          lap("Directus Ready");
          return res.json({
            success: true,
            directus_auth: response.data?.data || response.data,
            timings,
          });
        } catch (error) {
          const status = error?.response?.status;
          const errorMsg = error?.response?.data || error.message;
          console.error(
            `[AUTH DIRECTUS ERROR] Authentication failed for candidate ${identifier}:`,
            status,
            errorMsg,
          );

          if (status === 400 || status === 401 || status === 403) {
            sawInvalidCredentials = true;
          } else {
            sawNonAuthError = true;
          }
        }
      }

      timings["Directus Login"] = Date.now() - directusStart;
      if (sawInvalidCredentials && !sawNonAuthError) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      return res.status(503).json({
        error: "Authentication provider unavailable. Please try again.",
      });
    } catch (error) {
      console.error("[AUTH DIRECTUS CRITICAL ERROR]:", error.stack || error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getConfig(req, res) {
    try {
      const authHeader = req.headers?.authorization || "";
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (!match)
        return res.status(401).json({ error: "Missing Authorization token" });

      const token = match[1];
      const meRes = await retryDirectusRequest(
        () =>
          directusClient.get("/users/me", {
            headers: { Authorization: `Bearer ${token}` },
            params: { fields: "id" },
          }),
        {
          attempts: 3,
          baseDelayMs: 400,
          label: "Directus session validation",
        },
      );
      const directusUserId = meRes?.data?.data?.id ?? meRes?.data?.id;
      if (!directusUserId)
        return res.status(401).json({ error: "Invalid session" });

      const user = await User.findByPk(directusUserId, {
        include: ["roleData", "department"],
      });
      if (!user) return res.status(404).json({ error: "User not found" });

      const ensured = await ensureRolePermissionsForAllPages(
        user.role,
        user.roleData?.name,
        cachedPages,
      ).catch((syncError) => {
        console.warn(
          "[AUTH CONFIG] Permission sync skipped:",
          syncError?.message || syncError,
        );
        return false;
      });
      if (ensured) permsCache.delete(user.role);

      let normalizedPerms = getCachedPerms(user.role);
      if (!normalizedPerms) {
        const perms = await RolePermission.findAll({
          where: { role_id: user.role },
        });
        normalizedPerms = normalizePermissions(perms);
        setCachedPerms(user.role, normalizedPerms);
      }

      res.json({ user, permissions: normalizedPerms });
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }
      if (isTransientDirectusError(error)) {
        return res.status(503).json({
          error: "Authentication service temporarily unavailable. Please try again.",
        });
      }
      res.status(500).json({ error: error.message });
    }
  }

  static async getGuestConfig(req, res) {
    try {
      const guestRole = await Role.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("name")),
          "guest",
        ),
      });
      if (!guestRole) return res.json({ permissions: [] });

      const perms = await RolePermission.findAll({
        where: { role_id: guestRole.id },
      });
      res.json({ permissions: normalizePermissions(perms) });
    } catch (error) {
      res.json({ permissions: [] });
    }
  }

  static clearCache(roleId = null) {
    if (roleId) {
      permsCache.delete(roleId);
      console.log(`[AUTH CACHE] Cleared for role: ${roleId}`);
    } else {
      permsCache.clear();
      console.log(`[AUTH CACHE] Cleared ALL`);
    }
  }
}

module.exports = AuthController;
