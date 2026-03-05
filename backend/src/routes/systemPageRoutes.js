const express = require('express');
const router = express.Router();
const SystemPageController = require('../controllers/SystemPageController');

router.get('/', SystemPageController.getAll);
router.post('/sync', SystemPageController.sync);
router.post('/', SystemPageController.create);
router.delete('/:id', SystemPageController.delete);

module.exports = router;
