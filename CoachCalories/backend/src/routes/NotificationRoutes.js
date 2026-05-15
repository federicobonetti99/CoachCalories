const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.put('/read/:recipient', notificationController.markAsRead);

router.put('/read-one/:id', notificationController.markAsReadOne);

router.get('/:recipient', notificationController.getNotifications);

module.exports = router;