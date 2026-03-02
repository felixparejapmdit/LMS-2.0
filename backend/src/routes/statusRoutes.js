const express = require('express');
const router = express.Router();
const StatusController = require('../controllers/StatusController');

router.get('/', StatusController.getAll);
router.get('/:id', StatusController.getById);
router.post('/', StatusController.create);
router.put('/:id', StatusController.update);
router.delete('/:id', StatusController.delete);

module.exports = router;
