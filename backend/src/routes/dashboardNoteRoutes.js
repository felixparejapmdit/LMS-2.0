const express = require('express');
const router = express.Router();
console.log('[BOOT] dashboardNoteRoutes.js loaded');
const DashboardNoteController = require('../controllers/DashboardNoteController');

router.get('/', DashboardNoteController.getAll);
router.post('/', DashboardNoteController.create);
router.put('/:id', DashboardNoteController.update);
router.delete('/:id', DashboardNoteController.delete);

module.exports = router;
