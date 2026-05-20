require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function checkModels() {
    console.log("🔍 Sto interrogando i server di Groq...");
    try {
        const models = await groq.models.list();
        console.log("✅ I modelli attualmente ATTIVI e supportati sono:");
        models.data.forEach(m => console.log(`👉 ${m.id}`));
    } catch (e) {
        console.error("❌ Errore API Groq:", e.message);
    }
}

checkModels();