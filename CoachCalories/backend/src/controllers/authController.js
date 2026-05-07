const { userModel } = require('../models/userModel');
const jwt = require('jsonwebtoken');

exports.login = (req, res) => {
    const { email, password } = req.body; 

    userModel.findOne({ email: email }) 
        .then(user => {
            if (!user) {
                return res.status(401).json({ success: false, message: 'Email non trovata nel sistema' });
            }

            // Confronto password (in futuro useremo bcrypt, per ora resta fedele al tuo reset)
            if (user.password === password) {
                
                // 1. Inizializziamo le variabili per i dati fisiologici
                let currentWeight = null;
                let currentHeight = null;
                let currentAge = null;
                let currentGender = 'M'; // Valore di default
                let currentActivityLevel = 'moderate';

                // 2. Estraiamo i dati dall'array se presente (grazie al nuovo Model ora Mongoose lo vede)
                if (user.physiologicalHistory && user.physiologicalHistory.length > 0) {
                    // Cerchiamo il record attivo (senza endDate) o prendiamo l'ultimo inserito
                    const activeData = user.physiologicalHistory.find(h => !h.endDate) 
                                     || user.physiologicalHistory[user.physiologicalHistory.length - 1];

                    if (activeData) {
                        currentWeight = activeData.weight;
                        currentHeight = activeData.height;
                        currentAge = activeData.age;
                        currentGender = activeData.gender || 'M';
                        currentActivityLevel = activeData.activityLevel || 'moderate';
                    }
                }

                // 3. Generazione del token
                const token = jwt.sign(
                    { id: user._id, email: user.email, grade: user.authenticationGrade },
                    'IL_TUO_SEGRETO', 
                    { expiresIn: '1d' }
                );

                // 4. Risposta completa al Frontend
                res.json({
                    success: true,
                    username: user.username,
                    email: user.email,
                    authenticationGrade: user.authenticationGrade,
                    token: token,
                    weight: currentWeight,
                    height: currentHeight,
                    age: currentAge,
                    gender: currentGender,
                    activityLevel: currentActivityLevel
                });

            } else {
                res.status(401).json({ success: false, message: 'Password errata' });
            }
        })
        .catch(err => {
            console.error('Errore Login:', err);
            res.status(500).json({ success: false, message: 'Errore interno del server' });
        });
};