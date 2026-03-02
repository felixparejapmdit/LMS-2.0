const express = require('express');
const router = express.Router();
const PersonController = require('../controllers/PersonController');

router.get('/search', PersonController.search);
router.get('/', PersonController.getAll);
router.post('/', PersonController.create);
router.put('/:id', PersonController.update);
router.delete('/:id', PersonController.delete);

module.exports = router;
