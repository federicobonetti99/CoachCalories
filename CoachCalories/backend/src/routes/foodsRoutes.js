const express = require('express');
const router = express.Router();
const controller = require('../controllers/foodsController');

// Rotta principale: http://localhost:3000/foods
router.route('/')
    .get(controller.listFoods)   // Prende tutti i cibi
    .post(controller.createFood);

router.route('/top-calorie')
    .get(controller.findTopCalorieFood);

router.route('/search')
    .get(controller.findFoodByQuery);

router.route('/:id')
    .get(controller.readFood)    // Legge un cibo specifico
    .put(controller.updateFood)   // Modifica un cibo
    .delete(controller.deleteFood); // Elimina un cibo

module.exports = router;
