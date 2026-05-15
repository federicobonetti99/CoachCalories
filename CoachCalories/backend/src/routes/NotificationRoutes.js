const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// --- AGGIORNAMENTO (PUT) ---
router.put('/read/:recipient', notificationController.markAsRead);
router.put('/read-one/:id', notificationController.markAsReadOne);

// --- RECUPERO (GET) ---
router.get('/:recipient', notificationController.getNotifications);
router.get('/all/:recipient', notificationController.getAllNotifications);

// --- ELIMINAZIONE (DELETE) ---
// 🌟 MANCAVA QUESTA:
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;