const express = require('express');
const router = express.Router();
const EndorsementController = require('../controllers/EndorsementController');

router.get('/', EndorsementController.getAll);
router.get('/count', EndorsementController.count);
router.post('/', EndorsementController.create);
router.post('/notify-telegram', EndorsementController.notifyTelegram);
router.delete('/:id', EndorsementController.delete);

module.exports = router;
