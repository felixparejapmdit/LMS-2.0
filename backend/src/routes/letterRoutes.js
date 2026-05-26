const express = require('express');
const router = express.Router();
const LetterController = require('../controllers/LetterController');

router.get('/', LetterController.getAll);
router.get('/trash-count', LetterController.getTrashCount);
router.get('/summary-suggestions', LetterController.getSummarySuggestions);
router.get('/preview/ids', LetterController.getPreviewIds);
router.get('/lms-id/:lms_id', LetterController.getByLmsId);
router.get('/:id', LetterController.getById);
router.post('/', LetterController.create);
router.post('/bulk-create-empty', LetterController.bulkCreateEmpty);
router.post('/bulk-permanent-delete', LetterController.bulkDeletePermanent);
router.put('/:id', LetterController.update);
router.post('/:id/restore', LetterController.restore);
router.delete('/:id/scanned-copy', LetterController.deleteScannedCopy);
router.delete('/:id/permanent', LetterController.deletePermanent);
router.delete('/:id', LetterController.delete);

module.exports = router;
