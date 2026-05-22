require('dotenv').config();
const Groq = require('groq-sdk');
const mongoose = require('mongoose');

// 1. Inizializza Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 2. Recupera i modelli
const diaryModel = mongoose.models.Diary || mongoose.model('Diary');
const { userModel } = require('../models/userModel');

// 3. I DUE STRUMENTI SEPARATI
const tools = [
    {
        // STRUMENTO 1: OGGI (Default)
        type: "function",
        function: {
            name: "inserisci_cibo_oggi",
            description: "Usa QUESTA funzione se l'utente dice di aver mangiato qualcosa OGGI, o se NON specifica alcuna data (es: 'ho mangiato una mela'). NON usarla se parla di ieri.",
            parameters: {
                type: "object",
                properties: {
                    nome_alimento: { type: "string", description: "Nome dell'alimento consumato." },
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
        // STRUMENTO 2: GIORNI PASSATI
        type: "function",
        function: {
            name: "inserisci_cibo_giorni_passati",
            description: "Usa QUESTA funzione ESCLUSIVAMENTE se l'utente afferma esplicitamente di aver mangiato qualcosa in un giorno PASSATO (es: 'ieri ho mangiato', 'l'altro ieri ho preso').",
            parameters: {
                type: "object",
                properties: {
                    nome_alimento: { type: "string", description: "Nome dell'alimento consumato." },
                    data_riferimento: { 
                        type: "string", 
                        enum: ["ieri", "altro_ieri"], 
                        description: "Indica a quale giorno passato si riferisce." 
                    },
                    calorie: { type: "number" },
                    proteine_g: { type: "number" },
                    grassi_g: { type: "number" },
                    carboidrati_g: { type: "number" }
                },
                required: ["nome_alimento", "data_riferimento", "calorie", "proteine_g", "grassi_g", "carboidrati_g"]
            }
        }
    }
];

// Genera la data odierna forzando il fuso orario italiano (Europe/Rome)
const getTodayString = () => {
    const opzioni = { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' };
    const dataItaliana = new Date().toLocaleDateString('en-CA', opzioni); // Genera direttamente YYYY-MM-DD
    return dataItaliana;
};

// Genera l'array delle date passate calcolate sulla timezone italiana
const getPastDates = (numDays) => {
    const dates = [];
    const opzioni = { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' };
    
    for (let i = 0; i <= numDays; i++) {
        const d = new Date();
        // Sottraiamo i giorni all'ora locale italiana prima di formattare
        const dataLocale = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
        dataLocale.setDate(dataLocale.getDate() - i);
        
        const dataStringa = dataLocale.toLocaleDateString('en-CA', opzioni);
        dates.push(dataStringa);
    }
    return dates;
};

exports.handleChatMessage = async (req, res) => {
    try {
        const { message, username, chatHistory } = req.body;
        if (!message) return res.status(400).json({ error: "Devi scrivere qualcosa." });

        // Calcoliamo le date (0=Oggi, 1=Ieri, 2=L'altro ieri)
        const arrayDate = getPastDates(2); 
        const dataOggiStringa = arrayDate[0];

        // 🧠 A. QUERY DATI FISIOLOGICI
        const utente = await userModel.findOne({ username: username });
        let currentWeight = null, currentHeight = null, currentAge = null;
        let currentGender = 'M', currentActivityLevel = 'moderate';

        if (utente && utente.physiologicalHistory && utente.physiologicalHistory.length > 0) {
            const activeData = utente.physiologicalHistory.find(h => !h.endDate) 
                             || utente.physiologicalHistory[utente.physiologicalHistory.length - 1];
            if (activeData) {
                currentWeight = activeData.weight;
                currentHeight = activeData.height;
                currentAge = activeData.age;
                currentGender = activeData.gender || 'M';
                currentActivityLevel = activeData.activityLevel || 'moderate';
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
        const rangeDate = getPastDates(3);
        const diariPassati = await diaryModel.find({ username: username, date: { $in: rangeDate } });

        let contestoStorico = "Storico dei pasti registrati dall'utente nei giorni scorsi:\n";
        if (diariPassati.length === 0) {
            contestoStorico += "Nessun dato presente nel diario.\n";
        } else {
            diariPassati.forEach(d => {
                const listaCibi = d.foods && d.foods.length > 0 ? d.foods.map(f => `${f.nome} (${f.calorie} kcal)`).join(', ') : "Nessun cibo";
                contestoStorico += `- Data: ${d.date} | Cibi: ${listaCibi} | Totale: ${d.totals.calorie}/${tdeeStimato} kcal\n`;
            });
        }

        const infoFisiche = `Parametri utente: Peso ${currentWeight || '??'}kg, Altezza ${currentHeight || '??'}cm, Età ${currentAge || '??'}anni, TDEE: ${tdeeStimato} kcal.\nINFO TEMPO: Oggi è ${arrayDate[0]}, Ieri era ${arrayDate[1]}, L'altro ieri era ${arrayDate[2]}.`;

        // 🌟 C. DISATTIVAZIONE STRUMENTI DI SICUREZZA
        let toolChoice = "auto";
        const msgLower = message.toLowerCase();
        
        const isNotAnInsertion = 
            msgLower.includes("consigl") || 
            msgLower.includes("cosa mangio") || 
            msgLower.includes("come stai") || 
            msgLower.includes("ciao") || 
            msgLower.includes("buongiorno") ||
            msgLower.includes("cazzo") || 
            msgLower.includes("robot") || 
            msgLower.includes("ritardato") ||
            msgLower.includes("scherzavo") ||
            message.trim().length < 3;

        if (isNotAnInsertion) {
            toolChoice = "none";
        }

        // 🧠 D. COSTRUZIONE CONTESTO E COMPORTAMENTO
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
            const recentHistory = chatHistory.slice(-6);
            recentHistory.forEach(msg => {
                apiMessages.push({
                    role: msg.sender === 'user' ? "user" : "assistant",
                    content: msg.text
                });
            });
        }

        apiMessages.push({ role: "user", content: message });

        const chatCompletion = await groq.chat.completions.create({
            messages: apiMessages,
            model: "llama-3.1-8b-instant",
            tools: tools,
            tool_choice: toolChoice 
        });

        const responseMessage = chatCompletion.choices[0].message;

        // 🌟 E. GESTIONE DELLA CHIAMATA A UNO DEI DUE TOOLS
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolCall = responseMessage.tool_calls[0];
            const functionName = toolCall.function.name;
            
            // Verifichiamo se ha chiamato uno dei nostri due tool
            if (functionName === "inserisci_cibo_oggi" || functionName === "inserisci_cibo_giorni_passati") {
                const args = JSON.parse(toolCall.function.arguments);

                if (isNotAnInsertion || !args.nome_alimento || args.nome_alimento.toLowerCase().includes("zucchero") && !msgLower.includes("zucchero")) {
                    return res.json({
                        reply: "Se hai consumato un pasto, indicami nome e quantità per aggiornare il diario.",
                        action: "none"
                    });
                }

                // Logica di routing della data in base al tool utilizzato dall'IA
                let targetDateString = arrayDate[0]; // Partiamo da oggi
                let labelRisposta = "oggi";

                if (functionName === "inserisci_cibo_giorni_passati") {
                    if (args.data_riferimento === "ieri") {
                        targetDateString = arrayDate[1];
                        labelRisposta = "ieri";
                    } else if (args.data_riferimento === "altro_ieri") {
                        targetDateString = arrayDate[2];
                        labelRisposta = "l'altro ieri";
                    }
                }

                // Da qui in poi il salvataggio è identico per entrambi, cambia solo la data bersaglio
                let diario = await diaryModel.findOne({ username: username, date: targetDateString });
                if (!diario) {
                    diario = new diaryModel({ username: username, date: targetDateString, foods: [], totals: { calorie: 0, proteine_g: 0, grassi_g: 0, carboidrati_g: 0 } });
                }

                const generatedId = new mongoose.Types.ObjectId();
                diario.foods.push({
                    foodId: generatedId,
                    _id: generatedId,
                    nome: args.nome_alimento,
                    calorie: args.calorie,
                    proteine_g: args.proteine_g,
                    grassi_g: args.grassi_g,
                    carboidrati_g: args.carboidrati_g,
                    orario: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });

                diario.totals.calorie += args.calorie;
                diario.totals.proteine_g += args.proteine_g;
                diario.totals.grassi_g += args.grassi_g;
                diario.totals.carboidrati_g += args.carboidrati_g;

                await diario.save();

                return res.json({
                    reply: `Ho aggiunto ${args.nome_alimento} (${args.calorie} kcal) al tuo diario per la giornata di **${labelRisposta}**.`,
                    action: "food_inserted"
                });
            }
        }

        return res.json({
            reply: responseMessage.content,
            action: "none"
        });

    } catch (error) {
        console.error("❌ Errore Chatbot:", error);
        res.status(500).json({ error: "Errore di elaborazione della chat." });
    }
};