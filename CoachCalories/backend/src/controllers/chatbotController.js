const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const mongoose = require('mongoose');

// Inizializziamo l'SDK con la tua chiave segreta
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Recuperiamo il modello del diario dal tuo database
const diaryModel = mongoose.models.Diary || mongoose.model('Diary');

// 🛠️ 1. DEFINIAMO GLI "STRUMENTI" (FUNCTION CALLING)
// Spieghiamo all'IA come è fatto il tuo database e quali parametri deve estrarre dalla frase dell'utente.
const insertFoodTool = {
    name: "inserisci_cibo_diario",
    description: "Inserisce un alimento nel diario giornaliero dell'utente. Usa questa funzione SOLO quando l'utente dichiara esplicitamente di aver mangiato o bevuto qualcosa. Stima tu i macronutrienti in base al cibo descritto.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            nome_alimento: {
                type: SchemaType.STRING,
                description: "Il nome del cibo e la quantità, es. 'Petto di pollo (200g)'"
            },
            calorie: {
                type: SchemaType.NUMBER,
                description: "Le calorie totali stimate per quella quantità"
            },
            proteine_g: {
                type: SchemaType.NUMBER,
                description: "Proteine totali in grammi stimate"
            },
            grassi_g: {
                type: SchemaType.NUMBER,
                description: "Grassi totali in grammi stimati"
            },
            carboidrati_g: {
                type: SchemaType.NUMBER,
                description: "Carboidrati totali in grammi stimati"
            }
        },
        required: ["nome_alimento", "calorie", "proteine_g", "grassi_g", "carboidrati_g"]
    }
};

// 🧠 2. LA FUNZIONE PRINCIPALE DELLA CHAT
exports.handleChatMessage = async (req, res) => {
    try {
        // Il frontend ci passerà il messaggio scritto e il nome dell'utente
        const { message, username } = req.body;

        if (!message) return res.status(400).json({ error: "Devi scrivere qualcosa." });

        // Configurazione del Modello con il "System Prompt" (Il cervello del Coach)
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash", 
            systemInstruction: `Sei CoachCalories AI, un personal trainer virtuale. L'utente con cui parli si chiama ${username || 'Bro'}. 
            Sei diretto, motivante, ma anche un po' sarcastico se l'utente mangia schifezze. 
            NON fare discorsi lunghi. Sii conciso. 
            Se l'utente ti dice che ha mangiato qualcosa, usa il tuo strumento 'inserisci_cibo_diario' per calcolare i macronutrienti e salvarli.`,
            tools: [{ functionDeclarations: [insertFoodTool] }]
        });

        // Avviamo la chat session
        const chat = model.startChat();
        
        // Mandiamo il messaggio dell'utente all'IA
        const result = await chat.sendMessage(message);
        
        // Controlliamo se l'IA ha deciso di usare il telecomando (Function Call)
        const functionCalls = result.response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            
            if (call.name === "inserisci_cibo_diario") {
                const args = call.args;

                // --- 💾 SALVATAGGIO NEL DATABASE MONGODB ---
                console.log(`🤖 L'IA ha intercettato del cibo: ${args.nome_alimento}. Salvataggio in corso...`);
                
                const oggi = new Date();
                const dataStringa = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`;

                let diario = await diaryModel.findOne({ username: username, date: dataStringa });
                if (!diario) {
                    diario = new diaryModel({ username: username, date: dataStringa, foods: [], totals: { calorie: 0, proteine_g: 0, grassi_g: 0, carboidrati_g: 0 } });
                }

                // Inseriamo il cibo estratto dall'IA
                diario.foods.push({
                    nome: args.nome_alimento,
                    calorie: args.calorie,
                    proteine_g: args.proteine_g,
                    grassi_g: args.grassi_g,
                    carboidrati_g: args.carboidrati_g,
                    orario: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });

                // Aggiorniamo i totali
                diario.totals.calorie += args.calorie;
                diario.totals.proteine_g += args.proteine_g;
                diario.totals.grassi_g += args.grassi_g;
                diario.totals.carboidrati_g += args.carboidrati_g;

                await diario.save();

                // 🔄 Diciamo all'IA che abbiamo salvato il cibo con successo nel DB
                const finalResult = await chat.sendMessage([{
                    functionResponse: {
                        name: "inserisci_cibo_diario",
                        response: { success: true, message: "Cibo salvato nel database. Ora dai una risposta finale all'utente." }
                    }
                }]);

                // Rispondiamo al frontend dicendo "Testo dell'IA" + Flag "Ho inserito un cibo"
                return res.json({
                    reply: finalResult.response.text(),
                    action: "food_inserted"
                });
            }
        }

        // Se l'IA non ha rilevato cibo, significa che stava solo facendo conversazione. Restituiamo il testo puro.
        return res.json({
            reply: result.response.text(),
            action: "none"
        });

    } catch (error) {
        console.error("❌ Errore Chatbot:", error);
        res.status(500).json({ error: "Il coach è svenuto sotto la pressa. Riprova più tardi." });
    }
};