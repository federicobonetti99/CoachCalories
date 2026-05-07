const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');

// Rotte per il diario
router.get('/', diaryController.getDiaryEntry);
router.post('/add', diaryController.addFoodToDiary);
router.delete('/clear/:date', diaryController.clearDailyDiary);
router.delete('/:date/:foodId', diaryController.removeFoodFromDiary);
router.get('/history', diaryController.getCalorieHistory);

module.exports = router;