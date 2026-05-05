const { foodModel } = require('../models/foodModel'); // Assicurati che il percorso sia corretto

exports.listFoods = (req, res) => {
    foodModel.find()
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

// 6. Trova l'alimento "Super" (ho rimosso l'ID fisso del prof che non funzionerebbe)
exports.findTopCalorieFood = (req, res) => {
    foodModel.findOne()
        .sort({ calorie: -1 }) // -1 per ordine decrescente (il più calorico)
        .then(doc => {
            res.json(doc);
        })
        .catch(err => {
            res.status(500).send(err);
        });
}

// 7. Ricerca avanzata (trasformata da "Attore/Anno" a "Nome/Calorie")
exports.findFoodByQuery = (req, res) => {
    const { nome, minCal, maxCal } = req.query;

    let query = foodModel.find();

    if (nome) {
        query = query.where('nome').regex(new RegExp(nome, 'i')); // 'i' per ignorare maiuscole/minuscole
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

exports.createFood = async (req, res) => {
    try {
        console.log("--- RICHIESTA RICEVUTA ---");
        console.log("Dati testo (body):", req.body);
        console.log("Dati file (file):", req.file);

        // Estrai i dati dal body
        const { nome, calorie, proteine, grassi, carboidrati, quantita, unita, unitaMisura } = req.body;

        const newFood = new foodModel({
            nome: nome,
            calorie: Number(calorie) || 0,
            // Mappiamo i campi del form alle proprietà attese dal database
            proteine_g: Number(proteine) || 0,
            grassi_g: Number(grassi) || 0,
            carboidrati_g: Number(carboidrati) || 0,
            quantita: Number(quantita) || 100,
            unita: unita || unitaMisura || 'g', 
            img: req.file ? req.file.filename : 'default.jpg'
        });

        const savedFood = await newFood.save();
        
        console.log("✅ Alimento salvato con successo!");
        
        res.status(201).json({
            success: true,
            message: "Alimento creato!",
            data: savedFood
        });

    } catch (err) {
        console.error("❌ ERRORE NEL SALVATAGGIO:", err.message);
        res.status(500).json({
            success: false,
            message: "Errore nel server durante il salvataggio",
            error: err.message
        });
    }
};