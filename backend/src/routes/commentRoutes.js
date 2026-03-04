const express = require('express');
const router = express.Router();
const CommentController = require('../controllers/CommentController');

router.get('/letter/:letter_id', CommentController.getByLetter);
router.post('/', CommentController.create);
router.put('/:id', CommentController.update);
router.delete('/:id', CommentController.delete);

module.exports = router;
