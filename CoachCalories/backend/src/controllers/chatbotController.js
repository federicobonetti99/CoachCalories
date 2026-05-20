require('dotenv').config();
const Groq = require('groq-sdk');
const mongoose = require('mongoose');

// 1. Inizializza Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 2. Recupera il modello del diario SENZA fare casini con l'ordine dei file
const diaryModel = mongoose.models.Diary || mongoose.model('Diary');

// 3. Definisci lo strumento per Groq
const tools = [
    {
        type: "function",
        function: {
            name: "inserisci_cibo_diario",
            description: "Usa questa funzione SOLO se l'utente dichiara di aver mangiato qualcosa. Stima tu calorie e macronutrienti.",
            parameters: {
                type: "object",
                properties: {
                    nome_alimento: { type: "string", description: "Nome e quantità, es. 'Petto di pollo (200g)'" },
                    calorie: { type: "number", description: "Calorie totali" },
                    proteine_g: { type: "number", description: "Proteine totali in grammi" },
                    grassi_g: { type: "number", description: "Grassi totali in grammi" },
                    carboidrati_g: { type: "number", description: "Carboidrati totali in grammi" }
                },
                required: ["nome_alimento", "calorie", "proteine_g", "grassi_g", "carboidrati_g"]
            }
        }
    }
];

exports.handleChatMessage = async (req, res) => {
    try {
        const { message, username } = req.body;
        if (!message) return res.status(400).json({ error: "Devi scrivere qualcosa." });

        // 4. Chiamata all'intelligenza di Groq
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Sei CoachCalories AI. Parli con ${username || 'Bro'}. Sii motivante ma sarcastico. Sii conciso. Se ha mangiato, usa la funzione 'inserisci_cibo_diario'.`
                },
                { role: "user", content: message }
            ],
            model: "llama-3.1-8b-instant", // Modello verificato e funzionante
            tools: tools,
            tool_choice: "auto"
        });

        const responseMessage = chatCompletion.choices[0].message;

        // 5. Se Groq decide che c'è del cibo da inserire
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolCall = responseMessage.tool_calls[0];
            
            if (toolCall.function.name === "inserisci_cibo_diario") {
                const args = JSON.parse(toolCall.function.arguments);
                
                console.log(`🤖 Cibo intercettato da Groq: ${args.nome_alimento}`);

                const oggi = new Date();
                const dataStringa = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`;

                let diario = await diaryModel.findOne({ username: username, date: dataStringa });
                if (!diario) {
                    diario = new diaryModel({ username: username, date: dataStringa, foods: [], totals: { calorie: 0, proteine_g: 0, grassi_g: 0, carboidrati_g: 0 } });
                }

                // FIX DELLA VALIDAZIONE: Genera un ID fasullo ma valido per MongoDB
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

                // Diamo una risposta standard senza fare una seconda chiamata API per ridurre i rischi di crash
                return res.json({
                    reply: `Ho inserito ${args.nome_alimento} (${args.calorie} kcal) nel tuo diario. Ora non fare finta di niente e vai ad allenarti.`,
                    action: "food_inserted"
                });
            }
        }

        // 6. Se l'utente voleva solo chiacchierare
        return res.json({
            reply: responseMessage.content,
            action: "none"
        });

    } catch (error) {
        console.error("❌ Errore Chatbot:", error);
        res.status(500).json({ error: "Errore interno. Controlla il terminale del backend." });
    }
};