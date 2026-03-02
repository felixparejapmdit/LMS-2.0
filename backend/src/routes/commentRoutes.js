const express = require('express');
const router = express.Router();
const CommentController = require('../controllers/CommentController');

router.get('/letter/:letter_id', CommentController.getByLetter);
router.post('/', CommentController.create);

module.exports = router;
