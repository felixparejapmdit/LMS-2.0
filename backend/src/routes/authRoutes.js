const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

router.post('/login', AuthController.login);
router.get('/access-config', AuthController.getConfig);

module.exports = router;
