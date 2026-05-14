const { foodModel } = require('../models/foodModel'); // Assicurati che il percorso sia corretto

// 1. LISTA ALIMENTI: Modificata con la logica del Fallback per nascondere le proposte in attesa
exports.listFoods = (req, res) => {
    // Cerchiamo tutto ciò che NON ha approvato uguale a false ($ne: false)
    // Questo include sia i cibi esplicitamente true, sia quelli vecchi dove il campo non esiste
    foodModel.find({ approvato: { $ne: false } })
        .then(doc => {
            res.json(doc);
        })
        .catch(err => {
            res.status(500).send(err);
        });
}

exports.readFood = (req, res) => {
    foodModel.findById(req.params.id)
        .then(doc => {
            if (!doc) {
                return res.status(404).send('Alimento non trovato');
            }
            res.json(doc);
        })
        .catch(err => {
            res.status(500).send(err);
        });
}

exports.updateFood = async (req, res) => {
    try {
        const foodId = req.params.id;

        console.log("--- RICHIESTA DI SOSTITUZIONE ---");

        // 1. Verifichiamo che il vecchio alimento esista
        const oldFood = await foodModel.findById(foodId);
        if (!oldFood) {
            return res.status(404).send('Alimento non trovato');
        }

        // 2. Se l'utente non carica una nuova immagine, conserviamo il nome della vecchia
        if (!req.file && oldFood.img) {
            req.file = { filename: oldFood.img };
        }

        // 3. Eliminiamo il vecchio alimento dal database
        await foodModel.findByIdAndDelete(foodId);

        // 4. Richiamiamo createFood per salvare il nuovo elemento
        return exports.createFood(req, res);

    } catch (err) {
        console.error("❌ ERRORE NELL'AGGIORNAMENTO:", err.message);
        res.status(500).json({
            success: false,
            message: "Errore nel server durante l'aggiornamento",
            error: err.message
        });
    }
};

// 5. Elimina un alimento
exports.deleteFood = (req, res) => {
    foodModel.findByIdAndDelete(req.params.id)
        .then(doc => {
            if (!doc) {
                return res.status(404).send('Alimento non trovato');
            }
            res.json({ message: 'Alimento eliminato con successo' });
        })
        .catch(err => {
            res.status(500).send(err);
        });
}

// 6. Trova l'alimento "Super"
exports.findTopCalorieFood = (req, res) => {
    foodModel.findOne({ approvato: { $ne: false } }) // Escludiamo anche qui le proposte non approvate
        .sort({ calorie: -1 }) 
        .then(doc => {
            res.json(doc);
        })
        .catch(err => {
            res.status(500).send(err);
        });
}

// 7. Ricerca avanzata
exports.findFoodByQuery = (req, res) => {
    const { nome, minCal, maxCal } = req.query;

    // Partiamo già escludendo le proposte non approvate dal catalogo di ricerca
    let query = foodModel.find({ approvato: { $ne: false } });

    if (nome) {
        query = query.where('nome').regex(new RegExp(nome, 'i')); 
    }
    if (minCal && maxCal) {
        query = query.where('calorie').gte(minCal).lte(maxCal);
    }

    query
        .then(docs => {
            res.json(docs);
        })
        .catch(err => {
            res.status(500).send(err);
        });
}

// L'Admin crea un alimento (Approvato di default)
exports.createFood = async (req, res) => {
    try {
        console.log("--- CREAZIONE ALIMENTO ADMIN ---");
        const { nome, calorie, proteine, grassi, carboidrati, quantita, unita, unitaMisura } = req.body;

        const newFood = new foodModel({
            nome: nome,
            calorie: Number(calorie) || 0,
            proteine_g: Number(proteine) || 0,
            grassi_g: Number(grassi) || 0,
            carboidrati_g: Number(carboidrati) || 0,
            quantita: Number(quantita) || 100,
            unita: unita || unitaMisura || 'g', 
            img: req.file ? req.file.filename : 'default.jpg',
            approvato: true, // L'admin lo crea già attivo ed utilizzabile
            proposedBy: 'admin' // 🌟 Forziamo a 'admin' per tracciabilità
        });

        const savedFood = await newFood.save();
        res.status(201).json({ success: true, message: "Alimento creato!", data: savedFood });

    } catch (err) {
        console.error("❌ ERRORE NEL SALVATAGGIO:", err.message);
        res.status(500).json({ success: false, message: "Errore nel server durante il salvataggio", error: err.message });
    }
};

exports.approveFoodProposal = async (req, res) => {
    try {
        console.log(`--- CONTROLLER: Approvazione alimento ID: ${req.params.id} ---`);

        const approvedFood = await foodModel.findByIdAndUpdate(
            req.params.id,
            { approvato: true }, 
            { new: true }
        );

        if (!approvedFood) {
            return res.status(404).json({ success: false, message: "Alimento non trovato" });
        }

        res.status(200).json({ success: true, data: approvedFood });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🌟 STRUTTURA AGGIORNATA PER REGISTRARE IL PROPONENTE
exports.createProposal = async (req, res) => {
    try {
        console.log("--- PROPOSTA UTENTE RICEVUTA ---");
        const { nome, calorie, proteine, grassi, carboidrati, quantita, unita, unitaMisura, proposedBy } = req.body;

        const proponente = proposedBy || 'utente_anonimo@test.com';

        const newProposal = new foodModel({
            nome: nome,
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

        // 🌟 AGGIUNGI QUESTO BLOCCO QUI SOTTO PER LE NOTIFICHE 🌟
        if (req.io) {
            req.io.to('admin_room').emit('nuova-proposta-admin', {
                title: "Nuova Proposta",
                message: `L'utente ${proponente} ha proposto: ${nome}`,
                type: 'success'
            });
            console.log(`📢 Notifica push inviata agli admin per: ${nome}`);
        }
        // 🌟 --------------------------------------------- 🌟

        res.status(201).json({ 
            success: true, 
            message: "Proposta inviata con successo!", 
            data: savedProposal 
        });
    } catch (err) {
        console.error("❌ ERRORE NEL SALVATAGGIO DELLA PROPOSTA:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getAdminProposals = async (req, res) => {
    try {
        console.log("--- RICHIESTA PROPOSTE DA PARTE DELL'ADMIN ---");
        
        // Cerchiamo solo i cibi dove approvato è strettamente FALSE
        const proposals = await foodModel.find({ approvato: false });
        
        res.status(200).json(proposals);
    } catch (err) {
        console.error("❌ Errore recupero proposte admin:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};