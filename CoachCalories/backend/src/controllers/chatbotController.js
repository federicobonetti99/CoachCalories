require('dotenv').config();
const Groq = require('groq-sdk');
const mongoose = require('mongoose');

// 1. Inizializza Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 2. Recupera i modelli (Invariati, sicuri)
const diaryModel = mongoose.models.Diary || mongoose.model('Diary');
const { userModel } = require('../models/userModel');

// 3. Strumento per Groq con descrizione rigidissima
const tools = [
    {
        type: "function",
        function: {
            name: "inserisci_cibo_diario",
            description: "Usa questa funzione ESCLUSIVAMENTE se l'utente afferma in modo chiaro e diretto di aver MANGIATO o BEVUTO un alimento specifico OGGI (es: 'ho mangiato una mela', 'a pranzo ho preso 100g di riso'). NON attivare MAI per saluti, insulti, domande generiche, richieste di consigli o se l'utente non specifica un cibo reale.",
            parameters: {
                type: "object",
                properties: {
                    nome_alimento: { type: "string", description: "Nome dell'alimento consumato." },
                    calorie: { type: "number", description: "Calorie totali stimate" },
                    proteine_g: { type: "number", description: "Proteine totali in grammi" },
                    grassi_g: { type: "number", description: "Grassi totali in grammi" },
                    carboidrati_g: { type: "number", description: "Carboidrati totali in grammi" }
                },
                required: ["nome_alimento", "calorie", "proteine_g", "grassi_g", "carboidrati_g"]
            }
        }
    }
];

const getPastDates = (numDays) => {
    const dates = [];
    for (let i = 0; i <= numDays; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return dates;
};

exports.handleChatMessage = async (req, res) => {
    try {
        const { message, username, chatHistory } = req.body;
        if (!message) return res.status(400).json({ error: "Devi scrivere qualcosa." });

        const oggi = new Date();
        const dataOggiStringa = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`;

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

        // 🧠 B. RECUPERO STORICO ALIMENTARE RECENTE (La query stabile a 3 giorni)
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

        const infoFisiche = `Parametri utente: Peso ${currentWeight || '??'}kg, Altezza ${currentHeight || '??'}cm, Età ${currentAge || '??'}anni, TDEE: ${tdeeStimato} kcal.`;

        // 🌟 C. DISATTIVAZIONE STRUMENTI DI SICUREZZA (Evita l'attivazione se l'utente non sta dichiarando un pasto)
        let toolChoice = "auto";
        const msgLower = message.toLowerCase();
        
        // Parole chiave che indicano domande, saluti, insulti o consigli (Spegniamo i tool)
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
            toolChoice = "none"; // Disattiva a forza i tool per questa risposta
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

        // Inseriamo la cronologia dei messaggi precedenti se presenti
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

        // Chiamata a Groq
        const chatCompletion = await groq.chat.completions.create({
            messages: apiMessages,
            model: "llama-3.1-8b-instant",
            tools: tools,
            tool_choice: toolChoice // Utilizza la scelta dinamica e protetta
        });

        const responseMessage = chatCompletion.choices[0].message;

        // Se Groq prova a inserire un cibo oggi
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolCall = responseMessage.tool_calls[0];
            
            if (toolCall.function.name === "inserisci_cibo_diario") {
                const args = JSON.parse(toolCall.function.arguments);

                // 🌟 SCUDO DI CONTROLLO FINALE NEL BACKEND
                // Se lo strumento si è attivato per errore senza un cibo nominato dall'utente, blocchiamo tutto
                if (isNotAnInsertion || !args.nome_alimento || args.nome_alimento.toLowerCase().includes("zucchero") && !msgLower.includes("zucchero")) {
                    return res.json({
                        reply: "Se hai consumato un pasto specifico, indicami pure il nome e la quantità così posso aggiornare il tuo diario.",
                        action: "none"
                    });
                }

                let diario = await diaryModel.findOne({ username: username, date: dataOggiStringa });
                if (!diario) {
                    diario = new diaryModel({ username: username, date: dataOggiStringa, foods: [], totals: { calorie: 0, proteine_g: 0, grassi_g: 0, carboidrati_g: 0 } });
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
                    reply: `Ho aggiunto ${args.nome_alimento} (${args.calorie} kcal) al tuo diario per la giornata di oggi.`,
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