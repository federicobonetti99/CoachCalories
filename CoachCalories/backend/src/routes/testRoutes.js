const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurazione Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 'frontend/img/foods' parte dalla cartella principale dove hai index.js
        const dir = '../frontend/img/foods';
        
        // Verifica se la cartella esiste, altrimenti la crea
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Salviamo il file con un timestamp per evitare duplicati
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Rotta per il caricamento
router.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send("Errore: nessun file caricato.");
    }
    console.log("✅ File salvato in frontend/img/foods:", req.file.filename);
    res.json({ 
        message: "Caricato con successo!", 
        filename: req.file.filename 
    });
});

module.exports = router;