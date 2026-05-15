const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/:recipient', notificationController.getNotifications);

router.put('/read/:recipient', notificationController.markAsRead);

module.exports = router;