const express = require('express');
const router = express.Router();
const LetterKindController = require('../controllers/LetterKindController');

router.get('/', LetterKindController.getAll);
router.get('/:id', LetterKindController.getById);
router.post('/', LetterKindController.create);
router.put('/:id', LetterKindController.update);
router.delete('/:id', LetterKindController.delete);

module.exports = router;
