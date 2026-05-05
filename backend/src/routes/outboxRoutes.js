const express = require('express');
const router = express.Router();
const OutboxController = require('../controllers/OutboxController');

// GET /api/outbox/stats
// Returns per-status counts for outbox tabs, driven by ref_statuses collection
router.get('/stats', OutboxController.getStats);

module.exports = router;
