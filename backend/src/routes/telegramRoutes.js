const express = require('express');
const router = express.Router();
const TelegramController = require('../controllers/TelegramController');

router.get('/ping', TelegramController.ping);
router.post('/webhook', TelegramController.handleWebhook);
router.post('/notify-lms-bot', TelegramController.notifyLmsBot);

module.exports = router;
