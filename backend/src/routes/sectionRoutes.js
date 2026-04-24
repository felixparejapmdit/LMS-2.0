const express = require('express');
const router = express.Router();
const SectionController = require('../controllers/SectionController');

router.get('/registry', SectionController.getRegistry);
router.get('/overview', SectionController.getDashboardOverview);
router.get('/dept/:deptId/history', SectionController.getDeptUsage);
router.post('/force-new', SectionController.forceNewSection);

module.exports = router;
