const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// 1. Recupera notifiche non lette (Dropdown)
router.get('/:recipient', notificationController.getNotifications);

// 2. Recupera tutte le notifiche (Centro Notifiche)
router.get('/all/:recipient', notificationController.getAllNotifications);

// 3. Segna TUTTE come lette
router.put('/:recipient', notificationController.markAsRead);

// 4. Segna UNA singola notifica come letta
router.put('/read-one/:id', notificationController.markAsReadOne);

// 5. Elimina definitivamente una notifica
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;