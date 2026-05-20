require('dotenv').config();

async function checkModels() {
    console.log("🔍 Sto interrogando Google...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        
        if (data.error) {
            console.error("❌ Errore API:", data.error.message);
            return;
        }

        console.log("✅ I modelli sbloccati per la tua chiave sono:");
        data.models.forEach(m => {
            // Stampiamo solo quelli che supportano la generazione di testo/chat
            if (m.supportedGenerationMethods.includes("generateContent")) {
                console.log(`👉 ${m.name.replace('models/', '')}`);
            }
        });
    } catch (e) {
        console.error("Errore di connessione:", e);
    }
}

checkModels();