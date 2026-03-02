const express = require('express');
const router = express.Router();
const EndorsementController = require('../controllers/EndorsementController');

router.get('/', EndorsementController.getAll);
router.get('/count', EndorsementController.count);
router.post('/', EndorsementController.create);
router.delete('/:id', EndorsementController.delete);

module.exports = router;
