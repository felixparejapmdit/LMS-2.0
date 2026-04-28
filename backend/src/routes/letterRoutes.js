const express = require('express');
const router = express.Router();
const LetterController = require('../controllers/LetterController');

router.get('/', LetterController.getAll);
router.get('/preview/ids', LetterController.getPreviewIds);
router.get('/lms-id/:lms_id', LetterController.getByLmsId);
router.get('/:id', LetterController.getById);
router.post('/', LetterController.create);
router.post('/bulk-create-empty', LetterController.bulkCreateEmpty);
router.put('/:id', LetterController.update);
router.delete('/:id/scanned-copy', LetterController.deleteScannedCopy);
router.delete('/:id', LetterController.delete);

module.exports = router;
