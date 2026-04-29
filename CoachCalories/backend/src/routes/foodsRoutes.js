const express = require('express');
const router = express.Router();
const controller = require('../controllers/foodsController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- 1. CREAZIONE AUTOMATICA CARTELLA ---
// Se la cartella 'uploads' non esiste nel backend, la crea lui
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// --- 2. CONFIGURAZIONE STORAGE ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log("--- MULTER: Sto salvando il file... ---");
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname);
        console.log("--- MULTER: Nome file generato:", uniqueName);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

// --- 3. ROTTE ---

// NOTA: Assicurati che in Vue l'URL sia http://localhost:3000/foods
router.route('/')
    .get(controller.listFoods)
    .post(upload.single('image'), (req, res, next) => {
        console.log("--- ROUTER: Richiesta POST intercettata ---");
        next();
    }, controller.createFood);

router.route('/top-calorie').get(controller.findTopCalorieFood);
router.route('/search').get(controller.findFoodByQuery);
router.route('/:id')
    .get(controller.readFood)
    .put(controller.updateFood)
    .delete(controller.deleteFood);

module.exports = router;
