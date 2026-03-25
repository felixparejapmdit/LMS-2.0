const express = require('express');
const router = express.Router();
const LegacyController = require('../controllers/LegacyController');

// Replica of the letters_detailed.php API
router.get('/letters', LegacyController.getDetailedLetters);

module.exports = router;
