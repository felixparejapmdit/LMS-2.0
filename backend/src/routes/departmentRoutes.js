const express = require('express');
const router = express.Router();
const DepartmentController = require('../controllers/DepartmentController');

router.get('/', DepartmentController.getAll);
router.get('/:id', DepartmentController.getById);
router.post('/', DepartmentController.create);
router.put('/:id', DepartmentController.update);
router.delete('/:id', DepartmentController.delete);

module.exports = router;
