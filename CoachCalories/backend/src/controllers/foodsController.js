const { foodModel } = require('../models/foodModel'); 
// 🌟 IMPORTANTE: Importa la funzione per le notifiche persistenti
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

// 🌟 APPROVAZIONE PROPOSTA (Con notifica all'utente)
exports.approveFoodProposal = async (req, res) => {
    try {
        const approvedFood = await foodModel.findByIdAndUpdate(
            req.params.id,
            { approvato: true }, 
            { new: true }
        );

        if (!approvedFood) return res.status(404).json({ success: false, message: "Alimento non trovato" });

        // 🟢 Notifica persistente per l'utente che ha fatto la proposta
        if (approvedFood.proposedBy !== 'admin') {
            await createInternalNotification(
                approvedFood.proposedBy, // Destinatario (email utente)
                "✅ Proposta Approvata",
                `Il tuo alimento "${approvedFood.nome}" è stato approvato!`,
                'success'
            );
        }

        res.status(200).json({ success: true, data: approvedFood });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🌟 CREAZIONE PROPOSTA (Con notifica all'admin)
exports.createProposal = async (req, res) => {
    try {
        const { nome, calorie, proteine, grassi, carboidrati, quantita, unita, unitaMisura, proposedBy } = req.body;
        const proponente = proposedBy || 'utente_anonimo@test.com';

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
            proposedBy: proponente 
        });

        const savedProposal = await newProposal.save();

        // 🔵 1. Notifica Persistente nel Database (per l'admin)
        await createInternalNotification(
            'admin', 
            '🍎 Nuova Proposta', 
            `L'utente ${proponente} ha proposto: ${nome}`, 
            'info'
        );

        // 🔵 2. WebSocket Live
        if (req.io) {
            req.io.to('admin_room').emit('nuova-proposta-admin', {
                title: "Nuova Proposta",
                message: `L'utente ${proponente} ha proposto: ${nome}`,
                type: 'success'
            });
        }

        res.status(201).json({ success: true, message: "Proposta inviata!" });
    } catch (err) {
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