const mongoose = require('mongoose');

// Sotto-schema per la cronologia fisiologica
const physiologicalEntrySchema = new mongoose.Schema({
    weight: { type: Number, required: true },
    height: { type: Number, required: true },
    age: { type: Number, required: true },
    gender: { type: String, default: 'M' },
    activityLevel: { 
        type: String, 
        enum: ['sedentary', 'light', 'moderate', 'very', 'extra'], 
        default: 'moderate' 
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null }
});

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
        enum: ['admin', 'normal'],
        default: 'normal'
    },
    physiologicalHistory: [physiologicalEntrySchema]
});

const userModel = mongoose.model('User', userSchema);

module.exports = { userModel };