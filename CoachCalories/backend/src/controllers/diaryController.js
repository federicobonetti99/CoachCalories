const Diary = require('../models/DiaryModel');

// 1. Recupera il diario per una data e un username specifici
exports.getDiaryEntry = async (req, res) => {
    try {
        const { date, username } = req.query;

        if (!username) {
            return res.status(400).json({ message: 'Username non fornito' });
        }

        let diary = await Diary.findOne({ date, username });

        if (!diary) {
            // Se il diario non esiste, restituiamo una struttura vuota
            diary = {
                foods: [],
                totals: { calorie: 0, carboidrati_g: 0, proteine_g: 0, grassi_g: 0 }
            };
        }

        return res.status(200).json(diary);
    } catch (error) {
        console.error("Errore nel recupero del diario:", error);
        return res.status(500).json({ message: 'Errore del server' });
    }
};

// 2. Aggiunge un alimento al diario dell'utente
exports.addFoodToDiary = async (req, res) => {
    try {
        const { date, food, username } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'Username non fornito' });
        }

        let diary = await Diary.findOne({ date, username });

        // Struttura dell'alimento da aggiungere
        const newFoodItem = {
            foodId: food._id || food.foodId,
            nome: food.nome,
            calorie: food.calorie || 0,
            carboidrati_g: food.carboidrati_g || 0,
            proteine_g: food.proteine_g || 0,
            grassi_g: food.grassi_g || 0,
            quantita: food.quantita || 1,
            unita: food.unita || 'g'
        };

        if (!diary) {
            // Crea un nuovo documento diario se non esiste per l'utente
            diary = new Diary({
                date,
                username,
                foods: [newFoodItem],
                totals: {
                    calorie: newFoodItem.calorie,
                    carboidrati_g: newFoodItem.carboidrati_g,
                    proteine_g: newFoodItem.proteine_g,
                    grassi_g: newFoodItem.grassi_g
                }
            });
        } else {
            // Aggiunge l'alimento all'array del diario esistente dell'utente
            diary.foods.push(newFoodItem);
            
            // Aggiorna i totali della giornata
            diary.totals.calorie = (diary.totals.calorie || 0) + newFoodItem.calorie;
            diary.totals.carboidrati_g = (diary.totals.carboidrati_g || 0) + newFoodItem.carboidrati_g;
            diary.totals.proteine_g = (diary.totals.proteine_g || 0) + newFoodItem.proteine_g;
            diary.totals.grassi_g = (diary.totals.grassi_g || 0) + newFoodItem.grassi_g;
        }

        await diary.save();

        return res.status(200).json(diary);
    } catch (error) {
        console.error("Errore nell'aggiunta dell'alimento:", error);
        return res.status(500).json({ message: "Errore interno del server" });
    }
};

// 3. Rimuove un alimento dal diario dell'utente
exports.removeFoodFromDiary = async (req, res) => {
    try {
        const { date, foodId } = req.params;
        const { username } = req.query;

        if (!username) {
            return res.status(400).json({ message: 'Username non fornito' });
        }

        const diary = await Diary.findOne({ date, username });

        if (!diary) {
            return res.status(404).json({ message: "Diario non trovato per questa data" });
        }

        // Trova l'indice dell'alimento
        const foodIndex = diary.foods.findIndex(f => 
            (f._id && f._id.toString() === foodId) || (f.foodId && f.foodId.toString() === foodId)
        );

        if (foodIndex > -1) {
            const removedFood = diary.foods[foodIndex];

            // Sottrae i valori dai totali
            diary.totals.calorie = Math.max(0, (diary.totals.calorie || 0) - (removedFood.calorie || 0));
            diary.totals.carboidrati_g = Math.max(0, (diary.totals.carboidrati_g || 0) - (removedFood.carboidrati_g || 0));
            diary.totals.proteine_g = Math.max(0, (diary.totals.proteine_g || 0) - (removedFood.proteine_g || 0));
            diary.totals.grassi_g = Math.max(0, (diary.totals.grassi_g || 0) - (removedFood.grassi_g || 0));

            // Rimuove l'alimento dall'array
            diary.foods.splice(foodIndex, 1);

            await diary.save();

            return res.status(200).json(diary);
        } else {
            return res.status(404).json({ message: "Alimento non trovato nel diario" });
        }
    } catch (error) {
        console.error("Errore nella rimozione dell'alimento:", error);
        return res.status(500).json({ message: "Errore interno del server" });
    }
};

exports.getCalorieHistory = async (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ message: 'Username mancante' });

    try {
        // 1. Prendi gli ULTIMI 7 record inseriti (ordinando decrescente)
        const history = await Diary.find({ username })
            .sort({ date: -1 }) // -1 prende i più recenti per primi
            .limit(7);
            
        // 2. Rigira l'array per il grafico (che vuole ordine cronologico: 1, 2, 3...)
        const chronologicalHistory = history.reverse();

        res.json(chronologicalHistory);
    } catch (err) {
        console.error("Errore nel recupero dello storico:", err);
        res.status(500).json({ message: 'Errore interno del server' });
    }
};