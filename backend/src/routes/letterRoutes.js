const express = require('express');
const router = express.Router();
const LetterController = require('../controllers/LetterController');

router.get('/', LetterController.getAll);
router.get('/preview/ids', LetterController.getPreviewIds);
router.get('/:id', LetterController.getById);
router.post('/', LetterController.create);
router.put('/:id', LetterController.update);
router.delete('/:id', LetterController.delete);

module.exports = router;
