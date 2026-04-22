const { foodModel } = require('../models/foodModel'); // Assicurati che il percorso sia corretto

// 1. Lista tutti gli alimenti
exports.listFoods = (req, res) => {
    foodModel.find()
        .then(doc => {
            res.json(doc);
        })
        .catch(err => {
            res.status(500).send(err);
        });
}

// 2. Leggi un singolo alimento per ID
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

// 3. Crea un nuovo alimento
exports.createFood = (req, res) => {
    const food = new foodModel(req.body);
    food.save()
        .then(doc => {
            res.json(doc);
        })
        .catch(err => {
            res.status(500).send(err);
        });
}

// 4. Aggiorna un alimento
exports.updateFood = (req, res) => {
    foodModel.findByIdAndUpdate(req.params.id, req.body, { new: true })
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
// Questa funzione ora trova l'alimento più calorico (giusto per testare il sort)
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
// Esempio: cerca cibi che contengono una parola nel nome e hanno un range di calorie
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
