const express = require('express');
const router = express.Router();
const LetterAssignmentController = require('../controllers/LetterAssignmentController');

router.get('/', LetterAssignmentController.getAll);
router.post('/', LetterAssignmentController.create);
router.put('/:id', LetterAssignmentController.update);

module.exports = router;
