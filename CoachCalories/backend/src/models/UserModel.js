const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    authenticationGrade: {
        type: String, 
        enum: ['admin', 'normal'], // Accetta solo questi due valori
        default: 'normal'
    }
});

// Creiamo il modello 'User' basato sullo schema
const userModel = mongoose.model('User', userSchema);

module.exports = { userModel };