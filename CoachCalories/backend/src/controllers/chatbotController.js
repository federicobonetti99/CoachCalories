require('dotenv').config();
const Groq = require('groq-sdk');
const mongoose = require('mongoose');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const diaryModel = mongoose.models.Diary || mongoose.model('Diary');
const { userModel } = require('../models/userModel');

// 🌟 IMPORTA IL TUO MODELLO DEI CIBI CERTIFICATI
// Sostituisci il percorso con quello reale del tuo modello Food
const foodModel = mongoose.models.Food || require('../models/foodModel').foodModel;

// ==========================================
// 1. I 3 STRUMENTI (Invariati)
// ==========================================
const tools = [
    {
        type: "function",
        function: {
            name: "inserisci_cibo_oggi",
            description: "Usa QUESTA funzione se l'utente dice di aver mangiato qualcosa OGGI, o se NON specifica alcuna data.",
            parameters: {
                type: "object",
                properties: {
                    nome_alimento: { type: "string" },
                    calorie: { type: "number" },
                    proteine_g: { type: "number" },
                    grassi_g: { type: "number" },
                    carboidrati_g: { type: "number" }
                },
                required: ["nome_alimento", "calorie", "proteine_g", "grassi_g", "carboidrati_g"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "inserisci_cibo_giorni_passati",
            description: "Usa QUESTA funzione ESCLUSIVAMENTE se l'utente afferma di aver mangiato qualcosa in un giorno PASSATO (es: 'ieri', 'il 17/05').",
            parameters: {
                type: "object",
                properties: {
                    nome_alimento: { type: "string" },
                    data_riferimento: { type: "string", description: "La data passata indicata dall'utente, formato YYYY-MM-DD." },
                    calorie: { type: "number" },
                    proteine_g: { type: "number" },
                    grassi_g: { type: "number" },
                    carboidrati_g: { type: "number" }
                },
                required: ["nome_alimento", "data_riferimento", "calorie", "proteine_g", "grassi_g", "carboidrati_g"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "autocompila_giorno_vuoto",
            description: "Usa questa function se l'utente chiede di riempire un giorno passato vuoto. Valuta il tono per il moltiplicatore.",
            parameters: {
                type: "object",
                properties: {
                    data_riferimento: { type: "string", description: "Formato YYYY-MM-DD" },
                    moltiplicatore: { type: "number", description: "Sgarro = 1.5, Poco = 0.7, Neutro = 1.0" }
                },
                required: ["data_riferimento", "moltiplicatore"]
            }
        }
    }
];

const getPastDates = (numDays) => {
    const dates = [];
    const opzioni = { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' };
    for (let i = 0; i <= numDays; i++) {
        const dataLocale = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
        dataLocale.setDate(dataLocale.getDate() - i);
        dates.push(dataLocale.toLocaleDateString('en-CA', opzioni));
    }
    return dates;
};

exports.handleChatMessage = async (req, res) => {
    try {
        const { message, username, chatHistory } = req.body;
        if (!message) return res.status(400).json({ error: "Devi scrivere qualcosa." });

        const arrayDate = getPastDates(2); 
        const dataOggiStringa = arrayDate[0];

        // 🧠 A. QUERY DATI FISIOLOGICI
        const utente = await userModel.findOne({ username: username });
        let currentWeight = null, currentHeight = null, currentAge = null;
        let currentGender = 'M', currentActivityLevel = 'moderate';

        if (utente && utente.physiologicalHistory && utente.physiologicalHistory.length > 0) {
            const activeData = utente.physiologicalHistory.find(h => !h.endDate) || utente.physiologicalHistory.at(-1);
            if (activeData) {
                currentWeight = activeData.weight; currentHeight = activeData.height; currentAge = activeData.age;
                currentGender = activeData.gender || 'M'; currentActivityLevel = activeData.activityLevel || 'moderate';
            }
        }

        let tdeeStimato = 2000;
        if (currentWeight && currentHeight && currentAge) {
            let bmr = (10 * currentWeight) + (6.25 * currentHeight) - (5 * currentAge);
            bmr = (currentGender === 'M') ? bmr + 5 : bmr - 161;
            const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725, extra: 1.9 };
            tdeeStimato = Math.round(bmr * (multipliers[currentActivityLevel] || 1.2));
        }

        // 🧠 B. RECUPERO STORICO ALIMENTARE
        const diariPassati = await diaryModel.find({ username: username, date: { $in: arrayDate } });
        let contestoStorico = "Storico dei pasti:\n";
        diariPassati.forEach(d => {
            const listaCibi = d.foods?.length ? d.foods.map(f => `${f.nome} (${f.calorie} kcal)`).join(', ') : "Nessun cibo";
            contestoStorico += `- Data: ${d.date} | Cibi: ${listaCibi} | Totale: ${d.totals.calorie}/${tdeeStimato} kcal\n`;
        });

        const infoFisiche = `Parametri: Peso ${currentWeight || '??'}kg, TDEE: ${tdeeStimato} kcal.\nINFO TEMPO: Oggi è ${arrayDate[0]}. Ieri era ${arrayDate[1]}. L'altro ieri era ${arrayDate[2]}. Se l'utente indica una data specifica, calcola YYYY-MM-DD.`;

        // 🌟 C. DISATTIVAZIONE STRUMENTI
        let toolChoice = "auto";
        const msgLower = message.toLowerCase();
        const hasAction = msgLower.includes("mangiato") || msgLower.includes("bevuto") || msgLower.includes("preso") || msgLower.includes("riempi") || msgLower.includes("compila") || msgLower.includes("segnat");
        const isNotAnInsertion = !hasAction || message.trim().length < 3 || ["consigl", "cosa mangio", "cazzo", "robot", "ritardato"].some(kw => msgLower.includes(kw));
        if (isNotAnInsertion) toolChoice = "none";

        // 🧠 D. PROMPT SYSTEM (Il tuo originale blindato)
        const apiMessages = [
            {
                role: "system",
                content: `Sei un assistente virtuale esperto di nutrizione. Ti rivolgi a ${username}. Il tuo compito è aiutare l'utente a monitorare i suoi macro e calorie in modo chiaro, professionale ed educato, mantenendo un tono sintetico e asciutto. 

                REGOLE ASSOLUTE:
                1. NON fare diagnosi, NON parlare MAI di 'problemi di salute', 'problemi di nutrizione', patologie o disturbi. Limiti al calcolo energetico e al bilanciamento dei macro.
                2. Se l'utente fa domande o chiede consigli, rispondi con opzioni di alimenti sani (proteine magre, carbs complessi, verdure) coerenti con il suo TDEE.
                3. Se l'utente ti insulta o scherza, mantieni un tono professionale e distaccato, senza attivare strumenti o inventare cibi.
                4. Usa i dati storici solo per rispondere a domande esplicite sul passato.

                ${infoFisiche}
                ${contestoStorico}`
            }
        ];

        if (chatHistory && Array.isArray(chatHistory)) {
            chatHistory.slice(-6).forEach(msg => apiMessages.push({ role: msg.sender === 'user' ? "user" : "assistant", content: msg.text }));
        }
        apiMessages.push({ role: "user", content: message });

        const chatCompletion = await groq.chat.completions.create({
            messages: apiMessages, model: "llama-3.1-8b-instant", tools: tools, tool_choice: toolChoice 
        });

        const responseMessage = chatCompletion.choices[0].message;

        // 🌟 E. GESTIONE DEI TOOLS
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolCall = responseMessage.tool_calls[0];
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            if (isNotAnInsertion) return res.json({ reply: "Azione annullata.", action: "none" });

            // -- TOOL AUTOCOMPILAZIONE --
            if (functionName === "autocompila_giorno_vuoto") {
                let targetDateString = args.data_riferimento;
                const mult = args.moltiplicatore || 1.0;

                const diariValidi = await diaryModel.find({ username: username, 'totals.calorie': { $gt: 0 } }).sort({ date: -1 }).limit(7);
                let avgKcal = tdeeStimato, avgPro = 100, avgFat = 60, avgCarb = 200; 

                if (diariValidi.length > 0) {
                    avgKcal = diariValidi.reduce((acc, d) => acc + d.totals.calorie, 0) / diariValidi.length;
                    avgPro = diariValidi.reduce((acc, d) => acc + d.totals.proteine_g, 0) / diariValidi.length;
                    avgFat = diariValidi.reduce((acc, d) => acc + d.totals.grassi_g, 0) / diariValidi.length;
                    avgCarb = diariValidi.reduce((acc, d) => acc + d.totals.carboidrati_g, 0) / diariValidi.length;
                }

                const kcalFinali = Math.round(avgKcal * mult);
                const proFinali = Math.round(avgPro * mult);
                const fatFinali = Math.round(avgFat * mult);
                const carbFinali = Math.round(avgCarb * mult);

                let diario = await diaryModel.findOne({ username: username, date: targetDateString });
                if (!diario) diario = new diaryModel({ username: username, date: targetDateString, foods: [], totals: { calorie: 0, proteine_g: 0, grassi_g: 0, carboidrati_g: 0 } });

                const nomeVoce = mult > 1.2 ? "Autocompilazione Statistica (Sgarro)" : mult < 0.8 ? "Autocompilazione Statistica (Leggero)" : "Autocompilazione Statistica (Media)";

                diario.foods.push({
                    foodId: new mongoose.Types.ObjectId(), nome: nomeVoce, calorie: kcalFinali,
                    proteine_g: proFinali, grassi_g: fatFinali, carboidrati_g: carbFinali,
                    orario: new Date().toLocaleTimeString('en-US', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false })
                });

                diario.totals.calorie += kcalFinali; diario.totals.proteine_g += proFinali; diario.totals.grassi_g += fatFinali; diario.totals.carboidrati_g += carbFinali;
                await diario.save();

                return res.json({ reply: `Ho riempito il diario in data **${targetDateString}** (Modificatore: x${mult}). Aggiunte ${kcalFinali} kcal.`, action: "food_inserted" });
            }

            // -- TOOL INSERIMENTO NORMALE (Con Intercettatore di Database) --
            if (functionName === "inserisci_cibo_oggi" || functionName === "inserisci_cibo_giorni_passati") {
                if (!args.nome_alimento) return res.json({ reply: "Specificami l'alimento.", action: "none" });

                let targetDateString = functionName === "inserisci_cibo_giorni_passati" ? args.data_riferimento : arrayDate[0];

                // 🌟 VARIABILI DI OUTPUT (Partono con le stime dell'IA)
                let calorieFinali = args.calorie;
                let proteineFinali = args.proteine_g;
                let grassiFinali = args.grassi_g;
                let carboidratiFinali = args.carboidrati_g;
                let nomeAlimentoFinale = args.nome_alimento;

                // 🔍 INTERCETTAZIONE: Cerca il cibo nel tuo DB (usando regex case-insensitive sul nome)
                const ciboCertificato = await foodModel.findOne({ 
                    nome: { $regex: new RegExp(`^${args.nome_alimento}$`, "i") } 
                });

                if (ciboCertificato) {
                    // Trovato! Usiamo le sue proporzioni reali applicate alle calorie stime dell'IA
                    const dbKcal = ciboCertificato.calorie || 1; // Evita divisione per zero
                    
                    proteineFinali = Math.round(calorieFinali * (ciboCertificato.proteine_g / dbKcal));
                    grassiFinali = Math.round(calorieFinali * (ciboCertificato.grassi_g / dbKcal));
                    carboidratiFinali = Math.round(calorieFinali * (ciboCertificato.carboidrati_g / dbKcal));
                    nomeAlimentoFinale = ciboCertificato.nome; // Usa il nome preciso del DB
                    
                    console.log(`🎯 Intercettato cibo da DB: ${nomeAlimentoFinale}. Macro ricalcolati sulle ${calorieFinali} kcal dell'utente.`);
                } else {
                    console.log(`⚠️ Cibo [${args.nome_alimento}] non trovato nel DB interno. Uso le stime dell'IA.`);
                }

                // Salvataggio sul diario usando le variabili verificate
                let diario = await diaryModel.findOne({ username: username, date: targetDateString });
                if (!diario) diario = new diaryModel({ username: username, date: targetDateString, foods: [], totals: { calorie: 0, proteine_g: 0, grassi_g: 0, carboidrati_g: 0 } });

                diario.foods.push({
                    foodId: new mongoose.Types.ObjectId(),
                    nome: nomeAlimentoFinale,
                    calorie: calorieFinali,
                    proteine_g: proteineFinali, 
                    grassi_g: grassiFinali, 
                    carboidrati_g: carboidratiFinali,
                    orario: new Date().toLocaleTimeString('en-US', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false })
                });

                diario.totals.calorie += calorieFinali;
                diario.totals.proteine_g += proteineFinali;
                diario.totals.grassi_g += grassiFinali;
                diario.totals.carboidrati_g += carboidratiFinali;

                await diario.save();

                let tagCertificato = ciboCertificato ? " 🌟 (Valori da DB)" : "";
                return res.json({
                    reply: `Ho aggiunto ${nomeAlimentoFinale}${tagCertificato} (${calorieFinali} kcal) al tuo diario in data **${targetDateString}**.`,
                    action: "food_inserted"
                });
            }
        }

        return res.json({ reply: responseMessage.content, action: "none" });

    } catch (error) {
        console.error("❌ Errore Chatbot:", error);
        res.status(500).json({ error: "Errore di elaborazione della chat." });
    }
};