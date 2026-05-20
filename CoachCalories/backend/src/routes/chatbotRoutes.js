const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

// Quando il frontend fa un POST a /api/chat, scatta il Coach!
router.post('/', chatbotController.handleChatMessage);

module.exports = router;    