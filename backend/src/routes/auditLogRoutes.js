const express = require('express');
const router = express.Router();
const AuditLogController = require('../controllers/AuditLogController');

router.get('/', AuditLogController.getAll);
router.post('/', AuditLogController.create);

module.exports = router;
