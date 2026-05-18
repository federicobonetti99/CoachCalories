const { foodModel } = require('../models/foodModel');
const { createInternalNotification } = require('./notificationController');

// 1. LISTA ALIMENTI
exports.listFoods = (req, res) => {
    foodModel.find({ approvato: { $ne: false } })
        .then(doc => res.json(doc))
        .catch(err => res.status(500).send(err));
}

exports.readFood = (req, res) => {
    foodModel.findById(req.params.id)
        .then(doc => {
            if (!doc) return res.status(404).send('Alimento non trovato');
            res.json(doc);
        })
        .catch(err => res.status(500).send(err));
}

exports.updateFood = async (req, res) => {
    try {
        const foodId = req.params.id;
        const oldFood = await foodModel.findById(foodId);
        if (!oldFood) return res.status(404).send('Alimento non trovato');

        if (!req.file && oldFood.img) {
            req.file = { filename: oldFood.img };
        }

        await foodModel.findByIdAndDelete(foodId);
        return exports.createFood(req, res);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteFood = (req, res) => {
    foodModel.findByIdAndDelete(req.params.id)
        .then(doc => {
            if (!doc) return res.status(404).send('Alimento non trovato');
            res.json({ message: 'Alimento eliminato con successo' });
        })
        .catch(err => res.status(500).send(err));
}

exports.findTopCalorieFood = (req, res) => {
    foodModel.findOne({ approvato: { $ne: false } })
        .sort({ calorie: -1 }) 
        .then(doc => res.json(doc))
        .catch(err => res.status(500).send(err));
}

exports.findFoodByQuery = (req, res) => {
    const { nome, minCal, maxCal } = req.query;
    let query = foodModel.find({ approvato: { $ne: false } });

    if (nome) query = query.where('nome').regex(new RegExp(nome, 'i')); 
    if (minCal && maxCal) query = query.where('calorie').gte(minCal).lte(maxCal);

    query.then(docs => res.json(docs)).catch(err => res.status(500).send(err));
}

// Admin crea alimento
exports.createFood = async (req, res) => {
    try {
        const { nome, calorie, proteine, grassi, carboidrati, quantita, unita, unitaMisura } = req.body;
        const newFood = new foodModel({
            nome,
            calorie: Number(calorie) || 0,
            proteine_g: Number(proteine) || 0,
            grassi_g: Number(grassi) || 0,
            carboidrati_g: Number(carboidrati) || 0,
            quantita: Number(quantita) || 100,
            unita: unita || unitaMisura || 'g', 
            img: req.file ? req.file.filename : 'default.jpg',
            approvato: true,
            proposedBy: 'admin'
        });
        const savedFood = await newFood.save();
        res.status(201).json({ success: true, data: savedFood });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🟢 1. APPROVAZIONE PROPOSTA
exports.approveFoodProposal = async (req, res) => {
    try {
        const approvedFood = await foodModel.findByIdAndUpdate(
            req.params.id,
            { approvato: true }, 
            { new: true }
        );

        if (!approvedFood) return res.status(404).json({ success: false, message: "Alimento non trovato" });

        // Inviamo la notifica all'utente se la proposta non era un inserimento diretto dell'admin
        if (approvedFood.proposedBy && approvedFood.proposedBy !== 'admin') {
            const userNote = await createInternalNotification(
                approvedFood.proposedBy,
                "✅ Proposta Approvata",
                `Il tuo alimento "${approvedFood.nome}" è stato approvato!`,
                'success'
            );
            
            // 🌟 WEBSOCKET LIVE: Spediamo l'aggiornamento alla stanza privata dell'utente (la sua email)
            if (req.io && userNote) {
                req.io.to(approvedFood.proposedBy).emit('esito-proposta', {
                    id: userNote._id,
                    title: "Proposta Approvata",
                    message: `Il tuo alimento "${approvedFood.nome}" è stato approvato!`,
                    type: 'success'
                });
            }
        }

        res.status(200).json({ success: true, data: approvedFood });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🔴 2. RIFIUTO PROPOSTA (Esempio eliminando il record o modificando uno stato)
exports.rejectFoodProposal = async (req, res) => {
    try {
        // Troviamo l'alimento prima di eliminarlo per sapere chi lo aveva proposto
        const foodToDelete = await foodModel.findById(req.params.id);
        
        if (!foodToDelete) return res.status(404).json({ success: false, message: "Alimento non trovato" });

        const nomeAlimento = foodToDelete.nome;
        const emailProponente = foodToDelete.proposedBy;

        // Eliminiamo la proposta
        await foodModel.findByIdAndDelete(req.params.id);

        // Inviamo la notifica di rifiuto all'utente
        if (emailProponente && emailProponente !== 'admin') {
            const userNote = await createInternalNotification(
                emailProponente,
                "❌ Proposta Rifiutata",
                `La tua proposta per "${nomeAlimento}" non è stata accettata.`,
                'error'
            );
            
            // 🌟 WEBSOCKET LIVE: Spediamo il rifiuto alla stanza privata dell'utente
            if (req.io && userNote) {
                req.io.to(emailProponente).emit('esito-proposta', {
                    id: userNote._id,
                    title: "Proposta Rifiutata",
                    message: `La tua proposta per "${nomeAlimento}" non è stata accettata.`,
                    type: 'error'
                });
            }
        }

        res.status(200).json({ success: true, message: "Proposta rifiutata ed eliminata" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.createProposal = async (req, res) => {
    try {
        // 1. Leggiamo i dati del cibo + i dati dell'utente dal body
        const { nome, calorie, proteine, grassi, carboidrati, quantita, unita, unitaMisura, username, proposedBy } = req.body;
        
        // 2. RECUPERO DEL NOME (Sicuro ma flessibile)
        // Se il frontend ci passa l'username usiamo quello, altrimenti puliamo la mail, altrimenti "Utente"
        let nomeVisualizzato = "Utente";
        if (username) {
            nomeVisualizzato = username;
        } else if (proposedBy) {
            nomeVisualizzato = proposedBy.split('@')[0];
        }

        // 3. RECUPERO DELLA MAIL
        const emailProponente = proposedBy || 'utente_anonimo@test.com';

        const newProposal = new foodModel({
            nome,
            calorie: Number(calorie) || 0,
            proteine_g: Number(proteine) || 0,
            grassi_g: Number(grassi) || 0,
            carboidrati_g: Number(carboidrati) || 0,
            quantita: Number(quantita) || 100,
            unita: unita || unitaMisura || 'g', 
            img: req.file ? req.file.filename : 'default.jpg',
            approvato: false,
            proposedBy: emailProponente // Salviamo la mail nel DB
        });

        const savedProposal = await newProposal.save();

        // 🔵 1. Notifica interna con il NOME REALE dell'utente
        const notification = await createInternalNotification(
            'admin', 
            'Nuova Proposta', 
            `L'utente ${nomeVisualizzato} ha proposto: ${nome}`, 
            'success'
        );

        // 🔵 2. WebSocket Live all'admin con il NOME REALE
        if (req.io && notification) {
            req.io.to('admin_room').emit('nuova-proposta-admin', {
                id: notification._id, 
                title: "Nuova Proposta",
                message: `L'utente ${nomeVisualizzato} ha proposto: ${nome}`,
                type: 'success'
            });
        }

        res.status(201).json({ success: true, message: "Proposta inviata con successo!" });
    } catch (err) {
        console.error("❌ Errore proposta:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getAdminProposals = async (req, res) => {
    try {
        const proposals = await foodModel.find({ approvato: false });
        res.status(200).json(proposals);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};