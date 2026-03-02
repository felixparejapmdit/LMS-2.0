
const express = require('express');
const router = express.Router();
const TrayController = require('../controllers/TrayController');

router.get('/', TrayController.getAll);
router.get('/:id', TrayController.getById);
router.post('/', TrayController.create);
router.put('/:id', TrayController.update);
router.delete('/:id', TrayController.delete);

module.exports = router;
