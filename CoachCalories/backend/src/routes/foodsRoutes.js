const express = require('express');
const router = express.Router();
const controller = require('../controllers/foodsController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- 1. CONFIGURAZIONE STORAGE (MULTER) ---
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
        // Prendiamo il nome dall'input (es. "Pasta") o mettiamo un fallback
        let nomeInput = req.body.nome || 'alimento';
        
        // Pulizia: minuscolo e trattini al posto degli spazi
        const nomePulito = nomeInput.trim().toLowerCase().replace(/\s+/g, '-');
        
        // Recuperiamo l'estensione originale del file caricato
        const estensione = path.extname(file.originalname);

        // Nome finale con timestamp unico (es. seitan-17156000000.jpg)
        const timestamp = Date.now();
        cb(null, `${nomePulito}-${timestamp}${estensione}`);
    }
});

const upload = multer({ storage: storage });

// --- 2. ROTTE STATICHE / SPECIFICHE ---

// Rotta per il catalogo completo (GET)
router.route('/')
    .get(controller.listFoods);

// Rotta per il salvataggio Admin classico (POST /add)
router.post('/add', upload.single('image'), (req, res, next) => {
    console.log("--- ROUTER: Richiesta POST Admin intercettata ---");
    next();
}, controller.createFood);

// Rotta per l'invio della proposta da parte dell'utente (POST /proposals)
router.post('/proposals', upload.single('image'), (req, res, next) => {
    console.log("--- ROUTER: Richiesta POST Proposta Utente intercettata ---");
    next();
}, controller.createProposal);

// Rotta per l'admin per recuperare l'elenco dei cibi in attesa (GET)
router.get('/admin/proposals-list', controller.getAdminProposals);

// 🚀 NUOVA ROTTA ISOLATA: Approva un cibo specifico senza passare da updateFood e senza Multer
router.patch('/:id/approve', controller.approveFoodProposal);

// Rotte per query specifiche
router.route('/top-calorie').get(controller.findTopCalorieFood);
router.route('/search').get(controller.findFoodByQuery);

// --- 3. ROTTE DINAMICHE CON ID (In fondo per evitare conflitti) ---
router.route('/:id')
    .get(controller.readFood)
    .put(upload.single('image'), controller.updateFood) // 👈 Questo non lo tocchiamo più!
    .delete(controller.deleteFood);

module.exports = router;