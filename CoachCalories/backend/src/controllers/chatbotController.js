require('dotenv').config();
const Groq = require('groq-sdk');
const mongoose = require('mongoose');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const diaryModel = mongoose.models.Diary || mongoose.model('Diary');
const { userModel } = require('../models/userModel');

// 🌟 IMPORTA IL TUO MODELLO DEI CIBI CERTIFICATI
const foodModel = mongoose.models.Food || require('../models/foodModel').foodModel;

// ==========================================
// 1. I 3 STRUMENTI
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
                    nome_alimento: { 
                        type: "string", 
                        description: "INSERISCI SOLO IL NOME DEL CIBO, SENZA NUMERI O GRAMMI (es: 'pollo', 'cous cous', 'pasta')." 
                    },
                    quantita_g: { 
                        type: "number", 
                        description: "I grammi mangiati. Se l'utente specifica i grammi, inseriscili qui. SE NON LI SPECIFICA, scrivi sempre 100." 
                    },
                    calorie: { type: "number", description: "DEVI stimare le calorie. Valore maggiore di 0." },
                    proteine_g: { type: "number", description: "Stima le proteine." },
                    grassi_g: { type: "number", description: "Stima i grassi." },
                    carboidrati_g: { type: "number", description: "Stima i carboidrati." }
                },
                // Abbiamo reso la quantità OBBLIGATORIA
                required: ["nome_alimento", "quantita_g", "calorie", "proteine_g", "grassi_g", "carboidrati_g"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "inserisci_cibo_giorni_passati",
            description: "Usa QUESTA funzione ESCLUSIVAMENTE se l'utente afferma di aver mangiato in un giorno PASSATO (es: 'ieri').",
            parameters: {
                type: "object",
                properties: {
                    nome_alimento: { 
                        type: "string", 
                        description: "INSERISCI SOLO IL NOME DEL CIBO, SENZA NUMERI O GRAMMI (es: 'pollo', 'cous cous', 'pasta')." 
                    },
                    data_riferimento: { type: "string", description: "Data passata YYYY-MM-DD." },
                    quantita_g: { 
                        type: "number", 
                        description: "I grammi mangiati. Se l'utente specifica i grammi, inseriscili qui. SE NON LI SPECIFICA, scrivi sempre 100." 
                    },
                    calorie: { type: "number", description: "DEVI stimare le calorie. Valore maggiore di 0." },
                    proteine_g: { type: "number" },
                    grassi_g: { type: "number" },
                    carboidrati_g: { type: "number" }
                },
                // Abbiamo reso la quantità OBBLIGATORIA
                required: ["nome_alimento", "data_riferimento", "quantita_g", "calorie", "proteine_g", "grassi_g", "carboidrati_g"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "autocompila_giorno_vuoto",
            description: "Usa questa function se l'utente chiede di riempire un giorno passato vuoto.",
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
        // Aggiunti i verbi di inserimento per non fargli bypassare gli strumenti
        const hasAction = msgLower.includes("mangiato") || msgLower.includes("bevuto") || msgLower.includes("preso") || 
                          msgLower.includes("riempi") || msgLower.includes("compila") || msgLower.includes("segnat") ||
                          msgLower.includes("aggiungi") || msgLower.includes("inserisci") || msgLower.includes("registra");

        const isNotAnInsertion = !hasAction || message.trim().length < 3 || ["consigl", "cosa mangio", "cazzo", "robot", "ritardato"].some(kw => msgLower.includes(kw));
        if (isNotAnInsertion) toolChoice = "none";

        // 🧠 D. PROMPT SYSTEM (Il tuo originale blindato + Regola TDEE completa)
        const apiMessages = [
            {
                role: "system",
                content: `Sei un assistente virtuale esperto di nutrizione. Ti rivolgi a ${username}. Il tuo compito è aiutare l'utente a monitorare i suoi macro e calorie in modo chiaro, professionale ed educato, mantenendo un tono sintetico e asciutto. 

                REGOLE ASSOLUTE:
                1. NON fare diagnosi, NON parlare MAI di 'problemi di salute', 'problemi di nutrizione', patologie o disturbi. Limiti al calcolo energetico e al bilanciamento dei macro.
                2. IL TDEE È IL MANTENIMENTO: Se l'utente chiede "come sto andando?" o "cosa devo fare?", spiegagli brevemente che dipende dal suo obiettivo: per dimagrire (deficit) deve stare SOTTO il TDEE, per mettere massa (surplus) deve stare SOPRA, e se gli va bene il suo peso attuale deve semplicemente RAGGIUNGERE/MANTENERE il TDEE.
                3. Se l'utente fa domande o chiede consigli pratici, rispondi con opzioni di alimenti sani (proteine magre, carbs complessi, verdure).
                4. Se l'utente ti insulta o scherza, mantieni un tono professionale e distaccato, senza attivare strumenti o inventare cibi.
                5. Usa i dati storici solo per rispondere a domande esplicite sul passato.
                6. NON USARE MAI 0 PER LE CALORIE O I MACRO DEI CIBI. SE NON CONOSCI I VALORI, INVENTALI CON UNA STIMA REALISTICA
                7. MULTIPLI: Se l'utente ti chiede di inserire PIÙ cibi insieme (es. pollo e cous cous), DEVI fare una chiamata al tool separata per OGNI cibo.

                ${infoFisiche}
                ${contestoStorico}`
            }
        ];
        if (chatHistory && Array.isArray(chatHistory)) {
            chatHistory.slice(-6).forEach(msg => apiMessages.push({ role: msg.sender === 'user' ? "user" : "assistant", content: msg.text }));
        }
        apiMessages.push({ role: "user", content: message });

        let responseMessage = null;
        let tentativi = 0;
        let successo = false;

        while (tentativi < 3 && !successo) {
            tentativi++;
            try {
                // 1. Chiamiamo l'IA
                const chatCompletion = await groq.chat.completions.create({
                    messages: apiMessages, model: "llama-3.3-70b-versatile", tools: tools, tool_choice: toolChoice 
                });
                
                responseMessage = chatCompletion.choices[0].message;

                // 2. Controllo Anti-Crash: Se c'è un tool, proviamo a leggere il JSON. 
                // Se manca una virgola o una parentesi, JavaScript dà errore e il sistema passa al catch (riprovando)
                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    JSON.parse(responseMessage.tool_calls[0].function.arguments); 
                }

                // 3. Controllo Anti-Schifezze: Se nel testo ci sono graffe o tag strani, lo consideriamo un errore
                if (responseMessage.content && /<[\s\S]*?>|\{[\s\S]*?\}/.test(responseMessage.content)) {
                    throw new Error("L'IA ha stampato caratteri strani o codice nel testo.");
                }

                // Se superiamo i controlli, la risposta è perfetta e fermiamo il ciclo!
                successo = true;
                if (tentativi > 1) console.log(`✅ L'IA si è corretta da sola al tentativo ${tentativi}!`);

            } catch (err) {
                console.log(`⚠️ Tentativo ${tentativi} di Groq fallito. Motivo: ${err.message}. Sto riprovando di nascosto...`);
                if (tentativi === 3) {
                    // Se fallisce per 3 volte di fila, restituiamo un errore pulito all'utente
                    return res.json({ reply: "Il mio cervello elettronico si è un po' incartato coi numeri. Puoi scrivermelo di nuovo?", action: "none" });
                }
            }
        }

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            if (isNotAnInsertion) return res.json({ reply: "Azione annullata.", action: "none" });

            let messaggiRisposta = [];

            // 🔄 IL CICLO MAGICO: Gira per ogni cibo trovato!
            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;
                
                let args;
                try {
                    args = JSON.parse(toolCall.function.arguments);
                } catch (err) {
                    console.log("⚠️ Crash evitato: l'IA ha generato un JSON rotto per uno dei cibi.");
                    continue; // Passa al cibo successivo senza crashare!
                }

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
                    
                    messaggiRisposta.push(`Ho riempito il diario in data **${targetDateString}** (Modificatore: x${mult}). Aggiunte ${kcalFinali} kcal.`);
                }

                if (functionName === "inserisci_cibo_oggi" || functionName === "inserisci_cibo_giorni_passati") {
                    if (!args.nome_alimento) continue;

                    let targetDateString = functionName === "inserisci_cibo_giorni_passati" ? args.data_riferimento : arrayDate[0];

                    let quantitaPassataDaIA = (args.quantita_g && Number(args.quantita_g) > 0) ? Number(args.quantita_g) : undefined; 
                    let calorieFinali = (args.calorie && Number(args.calorie) > 0) ? Number(args.calorie) : 150; 
                    let proteineFinali = (args.proteine_g && Number(args.proteine_g) > 0) ? Number(args.proteine_g) : 10;
                    let grassiFinali = (args.grassi_g && Number(args.grassi_g) > 0) ? Number(args.grassi_g) : 5;
                    let carboidratiFinali = (args.carboidrati_g && Number(args.carboidrati_g) > 0) ? Number(args.carboidrati_g) : 15;
                    let nomeAlimentoFinale = args.nome_alimento;

                    const ciboCertificato = await foodModel.findOne({ 
                        nome: { $regex: new RegExp(`^${args.nome_alimento}$`, "i") } 
                    });

                    if (ciboCertificato) {
                        const quantitaRiferimentoDB = ciboCertificato.quantita_base || 100;
                        const quantitaEffettiva = quantitaPassataDaIA || quantitaRiferimentoDB;
                        const moltiplicatore = quantitaEffettiva / quantitaRiferimentoDB; 
                        
                        calorieFinali = Math.round((ciboCertificato.calorie || 100) * moltiplicatore);
                        proteineFinali = Math.round((ciboCertificato.proteine_g || 0) * moltiplicatore);
                        grassiFinali = Math.round((ciboCertificato.grassi_g || 0) * moltiplicatore);
                        carboidratiFinali = Math.round((ciboCertificato.carboidrati_g || 0) * moltiplicatore);
                        nomeAlimentoFinale = `${ciboCertificato.nome} (${quantitaEffettiva}g)`; 
                    } else if (quantitaPassataDaIA) {
                        nomeAlimentoFinale = `${args.nome_alimento} (${quantitaPassataDaIA}g)`;
                    }

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
                    messaggiRisposta.push(`Ho aggiunto ${nomeAlimentoFinale}${tagCertificato} (${calorieFinali} kcal) al tuo diario in data **${targetDateString}**.`);
                }
            } // <-- Fine del ciclo for

            // Invia all'utente il report completo di tutti i cibi!
            if (messaggiRisposta.length > 0) {
                return res.json({ reply: messaggiRisposta.join('\n'), action: "food_inserted" });
            }
        }

        return res.json({ reply: responseMessage.content, action: "none" });

    } catch (error) {
        console.error("❌ Errore Chatbot:", error);
        res.status(500).json({ error: "Errore di elaborazione della chat." });
    }
};