const mongoose = require('mongoose');

// Schema per il singolo alimento inserito nel diario
const foodItemSchema = new mongoose.Schema({
    foodId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Food', // Riferimento opzionale al modello del catalogo cibi
        required: true
    },
    nome: {
        type: String,
        required: true
    },
    calorie: {
        type: Number,
        default: 0
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
    quantita: {
        type: Number,
        default: 1
    },
    unita: {
        type: String,
        default: 'g'
    }
});

// Schema principale del Diario
const diarySchema = new mongoose.Schema({
    date: {
        type: String, // Esempio di formato: 'YYYY-MM-DD'
        required: true,
        index: true
    },
    username: {
        type: String,
        required: true,
        index: true
    },
    foods: [foodItemSchema], // Array di alimenti consumati nella giornata
    totals: {
        calorie: {
            type: Number,
            default: 0
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
        }
    }
}, { 
    timestamps: true // Aggiunge automaticamente createdAt e updatedAt
});

// Indice composto per evitare la creazione di più diari per lo stesso utente nello stesso giorno
diarySchema.index({ date: 1, username: 1 }, { unique: true });

const Diary = mongoose.model('Diary', diarySchema);

module.exports = Diary;