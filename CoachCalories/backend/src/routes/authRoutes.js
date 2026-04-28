const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Quando il frontend invia i dati al server
router.post('/login', authController.login);

module.exports = router;