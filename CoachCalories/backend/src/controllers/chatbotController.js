require('dotenv').config();
const Groq = require('groq-sdk');
const mongoose = require('mongoose');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const diaryModel = mongoose.models.Diary || mongoose.model('Diary');
const { userModel } = require('../models/userModel');

// ==========================================
// 1. I 3 STRUMENTI (Date Sbloccate)
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
            description: "Usa QUESTA funzione ESCLUSIVAMENTE se l'utente afferma di aver mangiato qualcosa in un giorno PASSATO (es: 'ieri', 'l'altro ieri', 'il 17/05').",
            parameters: {
                type: "object",
                properties: {
                    nome_alimento: { type: "string" },
                    data_riferimento: { 
                        type: "string", 
                        description: "La data passata indicata dall'utente, OBBLIGATORIAMENTE nel formato YYYY-MM-DD (es: 2026-05-17). Calcolala usando le INFO TEMPO del prompt." 
                    },
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
            description: "Usa questa funzione se l'utente chiede di RIEMPIRE o AUTOCOMPILARE un giorno passato in cui non ha segnato nulla. Valuta il tono per decidere il moltiplicatore.",
            parameters: {
                type: "object",
                properties: {
                    data_riferimento: { 
                        type: "string", 
                        description: "La data da riempire, OBBLIGATORIAMENTE nel formato YYYY-MM-DD (es: 2026-05-17). Calcolala usando le INFO TEMPO del prompt." 
                    },
                    moltiplicatore: { 
                        type: "number", 
                        description: "Se l'utente dice di aver esagerato o sgarrato, usa 1.5. Se dice di aver mangiato poco usa 0.7. Se è neutro usa 1.0." 
                    }
                },
                required: ["data_riferimento", "moltiplicatore"]
            }
        }
    }
];

// Funzioni per le date sicure (Timezone Italia)
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

        // 🧠 B. RECUPERO STORICO ALIMENTARE RECENTE
        const diariPassati = await diaryModel.find({ username: username, date: { $in: arrayDate } });

        let contestoStorico = "Storico dei pasti:\n";
        diariPassati.forEach(d => {
            const listaCibi = d.foods?.length ? d.foods.map(f => `${f.nome} (${f.calorie} kcal)`).join(', ') : "Nessun cibo";
            contestoStorico += `- Data: ${d.date} | Cibi: ${listaCibi} | Totale: ${d.totals.calorie}/${tdeeStimato} kcal\n`;
        });

        // La guida temporale infallibile per l'IA
        const infoFisiche = `Parametri: Peso ${currentWeight || '??'}kg, TDEE: ${tdeeStimato} kcal.\nINFO TEMPO: Oggi è ${arrayDate[0]}. Ieri era ${arrayDate[1]}. L'altro ieri era ${arrayDate[2]}. Se l'utente indica una data specifica (es. 17/05), calcola tu l'anno in base ad oggi e restituisci la stringa YYYY-MM-DD.`;

        // 🌟 C. DISATTIVAZIONE STRUMENTI DI SICUREZZA
        let toolChoice = "auto";
        const msgLower = message.toLowerCase();
        
        const hasAction = msgLower.includes("mangiato") || msgLower.includes("bevuto") || msgLower.includes("preso") || msgLower.includes("riempi") || msgLower.includes("compila") || msgLower.includes("segnat");
        
        const isNotAnInsertion = !hasAction || message.trim().length < 3 || ["consigl", "cosa mangio", "cazzo", "robot", "ritardato"].some(kw => msgLower.includes(kw));

        if (isNotAnInsertion) toolChoice = "none";

        // 🧠 D. COSTRUZIONE CONTESTO E COMPORTAMENTO
        const apiMessages = [
            {
                role: "system",
                content: `Sei un assistente virtuale esperto di nutrizione. Ti rivolgi a ${username}. 
                REGOLE ASSOLUTE:
                1. NON fare diagnosi e non parlare di salute.
                2. Se l'utente chiede consigli, rispondi con cibi sani.
                3. Mantieni un tono professionale e non farti fregare da scherzi.
                4. Usa i dati storici per il resoconto del passato.

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

            // -- LOGICA AUTOCOMPILAZIONE INTELLIGENTE --
            if (functionName === "autocompila_giorno_vuoto") {
                // Ora usiamo direttamente la data generata dall'IA (es. "2026-05-17")
                let targetDateString = args.data_riferimento;
                const mult = args.moltiplicatore || 1.0;

                // 1. Peschiamo gli ultimi 7 giorni in cui ha inserito qualcosa (> 0 kcal)
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
                    foodId: new mongoose.Types.ObjectId(),
                    nome: nomeVoce,
                    calorie: kcalFinali,
                    proteine_g: proFinali, grassi_g: fatFinali, carboidrati_g: carbFinali,
                    orario: new Date().toLocaleTimeString('en-US', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false })
                });

                diario.totals.calorie += kcalFinali;
                diario.totals.proteine_g += proFinali;
                diario.totals.grassi_g += fatFinali;
                diario.totals.carboidrati_g += carbFinali;

                await diario.save();

                return res.json({
                    reply: `Ho riempito il diario in data **${targetDateString}** basandomi sulla tua media storica (Modificatore applicato: x${mult}). Aggiunte ${kcalFinali} kcal.`,
                    action: "food_inserted"
                });
            }

            // -- LOGICA INSERIMENTO NORMALE (Oggi o Passato) --
            if (functionName === "inserisci_cibo_oggi" || functionName === "inserisci_cibo_giorni_passati") {
                if (!args.nome_alimento) return res.json({ reply: "Specificami l'alimento.", action: "none" });

                // Se è oggi usa arrayDate[0], altrimenti usa la data passata generata dall'IA
                let targetDateString = functionName === "inserisci_cibo_giorni_passati" ? args.data_riferimento : arrayDate[0];

                let diario = await diaryModel.findOne({ username: username, date: targetDateString });
                if (!diario) diario = new diaryModel({ username: username, date: targetDateString, foods: [], totals: { calorie: 0, proteine_g: 0, grassi_g: 0, carboidrati_g: 0 } });

                diario.foods.push({
                    foodId: new mongoose.Types.ObjectId(),
                    nome: args.nome_alimento,
                    calorie: args.calorie,
                    proteine_g: args.proteine_g, grassi_g: args.grassi_g, carboidrati_g: args.carboidrati_g,
                    orario: new Date().toLocaleTimeString('en-US', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false })
                });

                diario.totals.calorie += args.calorie;
                diario.totals.proteine_g += args.proteine_g;
                diario.totals.grassi_g += args.grassi_g;
                diario.totals.carboidrati_g += args.carboidrati_g;

                await diario.save();

                return res.json({
                    reply: `Ho aggiunto ${args.nome_alimento} (${args.calorie} kcal) al tuo diario in data **${targetDateString}**.`,
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