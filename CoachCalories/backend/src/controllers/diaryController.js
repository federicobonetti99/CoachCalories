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
        const { date, food, username, customQuantita } = req.body; // Riceviamo customQuantita dal frontend

        if (!username) {
            return res.status(400).json({ message: 'Username non fornito' });
        }

        let diary = await Diary.findOne({ date, username });

        // Definiamo i pesi per fare la proporzione
        const baseQuantita = Number(food.quantita) || 100; // La quantità di riferimento nel database (es. 90g o 100g)
        const targetQuantita = customQuantita ? Number(customQuantita) : baseQuantita; // Se non arriva nulla dal frontend, usa il default

        // Calcoliamo il fattore di moltiplicazione (es: 180g inseriti / 90g base = 2)
        const fattore = targetQuantita / baseQuantita;

        // Struttura dell'alimento con i valori nutrizionali ricalcolati
        const newFoodItem = {
            foodId: food._id || food.foodId,
            nome: food.nome,
            // Arrotondiamo le calorie all'intero e i macro a un solo decimale per non avere numeri infiniti
            calorie: Math.round((food.calorie || 0) * fattore),
            carboidrati_g: Number(((food.carboidrati_g || 0) * fattore).toFixed(1)),
            proteine_g: Number(((food.proteine_g || 0) * fattore).toFixed(1)),
            grassi_g: Number(((food.grassi_g || 0) * fattore).toFixed(1)),
            quantita: targetQuantita,
            unita: food.unita || 'g'
        };

        if (!diary) {
            // Se non esiste ancora la giornata, creiamo il documento da zero
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
            // Se il diario esiste già, aggiungiamo il cibo all'array
            diary.foods.push(newFoodItem);
            
            // Sommiamo i valori ricalcolati ai totali giornalieri
            diary.totals.calorie = Math.round((diary.totals.calorie || 0) + newFoodItem.calorie);
            diary.totals.carboidrati_g = Number(((diary.totals.carboidrati_g || 0) + newFoodItem.carboidrati_g).toFixed(1));
            diary.totals.proteine_g = Number(((diary.totals.proteine_g || 0) + newFoodItem.proteine_g).toFixed(1));
            diary.totals.grassi_g = Number(((diary.totals.grassi_g || 0) + newFoodItem.grassi_g).toFixed(1));
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
    const { username, days } = req.query; // Riceviamo 'days' dal frontend
    if (!username) return res.status(400).json({ message: 'Username mancante' });

    // Convertiamo 'days' in numero, default a 7 se non specificato o se è "all"
    const limitDays = days === 'all' ? 0 : parseInt(days) || 7;

    try {
        const history = await Diary.find({ username })
            .sort({ date: -1 }) 
            .limit(limitDays); // Se limit è 0, MongoDB restituisce tutto
            
        res.json(history.reverse());
    } catch (err) {
        console.error("Errore recupero storico:", err);
        res.status(500).json({ message: 'Errore interno' });
    }
};

exports.clearDailyDiary = async (req, res) => {
    const { date } = req.params;   // Esempio: '2026-05-07'
    const { username } = req.query; // Esempio: 'Federico'

    // Se mancano questi due, il database non saprebbe cosa cercare 
    // e noi blocchiamo l'operazione per sicurezza
    if (!date || !username) {
        return res.status(400).json({ message: "Dati mancanti per la cancellazione" });
    }

    try {
        const result = await Diary.findOneAndUpdate(
            { date: date, username: username }, // FILTRO: Solo questa data, solo questo utente
            { 
                $set: { 
                    foods: [], 
                    totals: { calorie: 0, carboidrati_g: 0, proteine_g: 0, grassi_g: 0 } 
                } 
            },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ message: "Nessun dato trovato per questa data" });
        }

        res.json({ success: true, message: `Giornata ${date} svuotata correttamente` });
    } catch (err) {
        res.status(500).json({ message: "Errore interno" });
    }
};