const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // A chi è rivolta la notifica? 
    // Sarà 'admin' per le proposte, o l'email dell'utente per le risposte.
    recipient: { 
        type: String, 
        required: true,
        index: true // Velocizza la ricerca per utente
    },
    
    title: { 
        type: String, 
        required: true 
    },
    
    message: { 
        type: String, 
        required: true 
    },
    
    // Utile per cambiare colore o icona nel frontend (es: 'success', 'info', 'warning')
    type: { 
        type: String, 
        default: 'info' 
    },
    
    // Stato della notifica
    read: { 
        type: Boolean, 
        default: false 
    },
    
    // Data di creazione per ordinarle (dalla più recente)
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

const notificationModel = mongoose.model('Notification', notificationSchema);

module.exports = { notificationModel };