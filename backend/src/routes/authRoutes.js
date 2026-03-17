const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

router.post('/login', AuthController.login);
router.get('/access-config', AuthController.getConfig);
router.get('/guest-config', AuthController.getGuestConfig);

module.exports = router;
