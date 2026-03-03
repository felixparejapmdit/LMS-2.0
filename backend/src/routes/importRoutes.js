const express = require('express');
const router = express.Router();
const ImportController = require('../controllers/ImportController');

router.post('/persons', ImportController.importPersons);
router.post('/users', ImportController.importUsers);

module.exports = router;
