const express = require('express');
const router = express.Router();
// Assicurati che il percorso porti al nuovo file foodController.js
const controller = require('../controllers/foodsController');

// Rotta principale: http://localhost:3000/foods
router.route('/')
    .get(controller.listFoods)   // Prende tutti i cibi
    .post(controller.createFood); // Crea un nuovo cibo

// Rotta per il cibo più calorico: http://localhost:3000/foods/top-calorie
router.route('/top-calorie')
    .get(controller.findTopCalorieFood);
    
// Rotta per la ricerca avanzata: http://localhost:3000/foods/search
// Esempio: /search?nome=pollo&minCal=100&maxCal=500
router.route('/search')
    .get(controller.findFoodByQuery);

// Rotte con ID: http://localhost:3000/foods/:id
router.route('/:id')
    .get(controller.readFood)    // Legge un cibo specifico
    .put(controller.updateFood)   // Modifica un cibo
    .delete(controller.deleteFood); // Elimina un cibo

module.exports = router;
