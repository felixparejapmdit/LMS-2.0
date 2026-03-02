const express = require('express');
const router = express.Router();
const ProcessStepController = require('../controllers/ProcessStepController');

router.get('/', ProcessStepController.getAll);
router.get('/:id', ProcessStepController.getById);
router.post('/', ProcessStepController.create);
router.put('/:id', ProcessStepController.update);
router.delete('/:id', ProcessStepController.delete);

module.exports = router;
