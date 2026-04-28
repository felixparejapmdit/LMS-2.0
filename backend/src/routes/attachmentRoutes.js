const express = require("express");
const router = express.Router();
const AttachmentController = require("../controllers/AttachmentController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max file size
  },
});

router.get("/", AttachmentController.getAll);
router.post("/upload", upload.single("file"), AttachmentController.upload);
router.get("/view/:id", AttachmentController.view);
router.get("/view-combined/:letter_id", AttachmentController.viewCombinedForLetter);
router.get("/view-path", AttachmentController.viewByPath);
router.get("/:id", AttachmentController.getById);
router.post("/", AttachmentController.create);
router.put("/:id", AttachmentController.update);
router.post("/combine-selected", AttachmentController.combineSelected);
router.delete("/:id", AttachmentController.delete);

module.exports = router;
