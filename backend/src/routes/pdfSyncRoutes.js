const express = require("express");
const router = express.Router();
const PdfSyncController = require("../controllers/PdfSyncController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure Multer for PDF file uploads
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) =>
    cb(null, `Upload-${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max file size
  },
});

router.get("/test", (req, res) =>
  res.json({ message: "Sync route active", time: new Date().toISOString() }),
);
router.post("/merge", upload.single("pdfFile"), PdfSyncController.mergeAndSync);

module.exports = router;
