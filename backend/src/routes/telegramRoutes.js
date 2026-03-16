const express = require('express');
const router = express.Router();
const TelegramController = require('../controllers/TelegramController');

router.get('/ping', TelegramController.ping);
router.post('/webhook', TelegramController.handleWebhook);

module.exports = router;
