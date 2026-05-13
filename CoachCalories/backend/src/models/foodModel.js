const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true
    },
    quantita: {
        type: Number,
        required: true
    },
    unita: {
        type: String,
        required: true
    },
    calorie: {
        type: Number,
        required: true
    },
    carboidrati_g: {
        type: Number,
        default: 0
    },
    proteine_g: {
        type: Number,
        default: 0
    },
    grassi_g: {
        type: Number,
        default: 0
    },
    img: String,
    note: String,
    // --- NUOVO CAMPO PER LA GESTIONE PROPOSTE UTENTE ---
    approvato: {
        type: Boolean
        // Lasciamo senza default per far funzionare i cibi vecchi come approvati
    }
});

// Il primo parametro 'Food' è il nome del modello, 
// Mongoose cercherà automaticamente la collezione 'foods' (al plurale)
const foodModel = mongoose.model('Food', foodSchema);

module.exports = { foodModel };