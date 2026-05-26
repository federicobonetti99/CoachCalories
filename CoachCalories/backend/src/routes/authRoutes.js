const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);

router.post('/update-physiological', authController.updatePhysiologicalData);

router.get('/history/:email', authController.getPhysiologicalHistory);

router.post('/delete-physiological', authController.deletePhysiologicalRecord);

module.exports = router;