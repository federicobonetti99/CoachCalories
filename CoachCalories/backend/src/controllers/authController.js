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

exports.updatePhysiologicalData = (req, res) => {
    const { email, weight, height, age, gender, activityLevel } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email mancante' });
    }

    userModel.findOne({ email: email })
        .then(user => {
            if (!user) {
                return res.status(404).json({ success: false, message: 'Utente non trovato' });
            }

            const now = new Date();

            // 1. Inizializziamo l'array se l'utente è vecchio e non lo aveva
            if (!user.physiologicalHistory) {
                user.physiologicalHistory = [];
            }

            // 2. Troviamo il record attualmente attivo (quello senza endDate)
            const activeRecord = user.physiologicalHistory.find(h => !h.endDate);
            
            // 3. Se esiste, lo "chiudiamo" impostando l'endDate a questo esatto istante
            if (activeRecord) {
                activeRecord.endDate = now;
            }

            // 4. Creiamo il NUOVO record. 
            // Avendo startDate ma NON endDate, questo diventerà automaticamente il nuovo record attivo.
            const newRecord = {
                weight: Number(weight),
                height: Number(height),
                age: Number(age),
                gender: gender,
                activityLevel: activityLevel,
                startDate: now
            };

            // 5. Lo pushiamo nello storico
            user.physiologicalHistory.push(newRecord);

            // 6. Salviamo il documento utente aggiornato nel DB
            user.save()
                .then(() => {
                    res.json({
                        success: true,
                        message: 'Dati fisiologici storicizzati e aggiornati con successo!',
                        newRecord: newRecord
                    });
                })
                .catch(err => {
                    console.error('Errore salvataggio DB:', err);
                    res.status(500).json({ success: false, message: 'Errore durante il salvataggio sul database' });
                });
        })
        .catch(err => {
            console.error('Errore ricerca utente:', err);
            res.status(500).json({ success: false, message: 'Errore interno del server' });
        });
};

exports.getPhysiologicalHistory = (req, res) => {
    const { email } = req.params;

    const { userModel } = require('../models/userModel'); // Assicurati che l'import sia corretto

    userModel.findOne({ email: email })
        .then(user => {
            if (!user) {
                return res.status(404).json({ success: false, message: 'Utente non trovato' });
            }
            
            // Se lo storico esiste, lo ordiniamo dal più recente al più vecchio
            let history = user.physiologicalHistory || [];
            history.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

            res.json({ success: true, history: history });
        })
        .catch(err => {
            console.error('Errore recupero storico:', err);
            res.status(500).json({ success: false, message: 'Errore interno del server' });
        });
};

// Aggiungi questo in authController.js
exports.deletePhysiologicalRecord = (req, res) => {
    const { email, recordId } = req.body;

    if (!email || !recordId) {
        return res.status(400).json({ success: false, message: 'Dati mancanti (email o recordId)' });
    }

    const { userModel } = require('../models/userModel');

    userModel.findOne({ email: email })
        .then(user => {
            if (!user) {
                return res.status(404).json({ success: false, message: 'Utente non trovato' });
            }

            // 1. Cerchiamo l'indice del record nell'array dello storico
            const recordIndex = user.physiologicalHistory.findIndex(h => h._id.toString() === recordId);

            if (recordIndex === -1) {
                return res.status(404).json({ success: false, message: 'Record non trovato nello storico' });
            }

            // 2. Controllo di sicurezza: permettiamo la cancellazione SOLO se è archiviato (ha un endDate)
            if (!user.physiologicalHistory[recordIndex].endDate) {
                return res.status(400).json({ success: false, message: 'Non puoi cancellare il record attualmente attivo!' });
            }

            // 3. Rimozione del record dall'array
            user.physiologicalHistory.splice(recordIndex, 1);

            // 4. Salviamo il documento utente aggiornato nel DB
            user.save()
                .then(() => {
                    res.json({ success: true, message: 'Record eliminato con successo dallo storico!' });
                })
                .catch(err => {
                    console.error('Errore salvataggio DB:', err);
                    res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento del database' });
                });
        })
        .catch(err => {
            console.error('Errore eliminazione record:', err);
            res.status(500).json({ success: false, message: 'Errore interno del server' });
        });
};