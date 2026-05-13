const express = require('express');
const router = express.Router();
const controller = require('../controllers/foodsController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- 1. CONFIGURAZIONE STORAGE ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Percorso per arrivare alla cartella nel frontend
        const dir = path.join(__dirname, '../../../frontend/img/foods');
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Prendiamo il nome dall'input (es. "Pasta")
        let nomeInput = req.body.nome || 'alimento';
        
        // Pulizia: minuscolo e trattini al posto degli spazi
        const nomePulito = nomeInput.trim().toLowerCase().replace(/\s+/g, '-');
        
        // Recuperiamo l'estensione originale del file caricato
        const estensione = path.extname(file.originalname);

        // NOME FINALE CON TIMESTAMP: Evita sovrascritture se più utenti inviano proposte (es. kefir-17156000000.jpg)
        const timestamp = Date.now();
        cb(null, `${nomePulito}-${timestamp}${estensione}`);
    }
});

const upload = multer({ storage: storage });

// --- 2. ROTTE ---

// Rotta per il catalogo (GET)
router.route('/')
    .get(controller.listFoods);

// Rotta per il salvataggio Admin (POST /add)
router.post('/add', upload.single('image'), (req, res, next) => {
    console.log("--- ROUTER: Richiesta POST Admin intercettata ---");
    next();
}, controller.createFood);

// Adesso usa Multer esattamente come l'admin per elaborare la foto allegata!
router.post('/proposals', upload.single('image'), (req, res, next) => {
    console.log("--- ROUTER: Richiesta POST Proposta Utente intercettata ---");
    next();
}, controller.createProposal);


router.get('/admin/proposals-list', controller.getAdminProposals);

// Rotte per query specifiche
router.route('/top-calorie').get(controller.findTopCalorieFood);
router.route('/search').get(controller.findFoodByQuery);

// Rotte basate sull'ID dell'alimento
router.route('/:id')
    .get(controller.readFood)
    .put(upload.single('image'), controller.updateFood)
    .delete(controller.deleteFood);
    

module.exports = router;