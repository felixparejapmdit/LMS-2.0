const express = require("express");
const router = express.Router();
const AppSettingsController = require("../controllers/AppSettingsController");
const { ensureAuthenticated } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeOriginal = path
      .basename(file.originalname || "upload")
      .replace(/[^\w.\-]+/g, "_");
    const nonce = Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${Date.now()}-${nonce}-${safeOriginal}`);
  },
});

const allowedByField = {
  favicon: new Set([
    "image/x-icon",
    "image/vnd.microsoft.icon",
    "image/png",
    "image/svg+xml",
    "application/octet-stream", // some browsers/clients send .ico as octet-stream
  ]),
  sidebar_logo: new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
    "image/gif",
  ]),
  login_logo: new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
    "image/gif",
  ]),
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 3,
  },
  fileFilter: (req, file, cb) => {
    const allowed = allowedByField[file.fieldname];
    if (!allowed) return cb(null, false);
    if (allowed.has(file.mimetype) || (file.mimetype || "").startsWith("image/")) {
      return cb(null, true);
    }
    return cb(new Error(`Unsupported file type for ${file.fieldname}`));
  },
});

router.get("/", AppSettingsController.getSettings);
router.post("/", ensureAuthenticated, upload.fields([
  { name: 'favicon', maxCount: 1 },
  { name: 'sidebar_logo', maxCount: 1 },
  { name: 'login_logo', maxCount: 1 }
]), AppSettingsController.saveSettings);

module.exports = router;
