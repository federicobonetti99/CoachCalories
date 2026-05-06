const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');

router.get('/', diaryController.getDiaryEntry);
router.post('/add', diaryController.addFoodToDiary);
router.delete('/:date/:foodId', diaryController.removeFoodFromDiary);

module.exports = router;