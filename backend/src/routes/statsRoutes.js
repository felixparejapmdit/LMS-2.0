const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/StatsController');

router.get('/dashboard', StatsController.getDashboardStats);
router.get('/inbox', StatsController.getInboxStats);

module.exports = router;
