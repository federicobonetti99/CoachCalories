const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Percorso per arrivare alla cartella foods nel frontend
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

        // NOME FINALE: solo nome pulito + estensione (es. pasta.jpg)
        cb(null, nomePulito + estensione);
    }
});

const upload = multer({ storage: storage });

router.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).send("Errore: nessun file.");
    
    console.log("✅ File salvato come:", req.file.filename);
    
    res.json({ 
        message: "Caricato con successo!", 
        filename: req.file.filename 
    });
});

module.exports = router;