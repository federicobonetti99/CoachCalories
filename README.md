# CoachCalories - Guida all'Installazione e al Deployment Locale

Questo documento descrive le procedure per configurare, installare e avviare l'architettura Full-Stack di **CoachCalories** in un ambiente locale. Il sistema opera secondo un'architettura client-server disaccoppiata, composta da un backend in **Express.js** e un frontend reattivo sviluppato con **Vue.js (Vite)**.

---

## 1. Prerequisiti

Prima di procedere con l'avvio dei servizi, assicurarsi di aver installato sul proprio sistema i seguenti componenti:
* **Node.js** (versione 16.x o superiore)
* **npm** (Node Package Manager, normalmente incluso con Node.js)
* **MongoDB** attivo in locale (tramite installazione nativa o container Docker sulla porta standard `27017`)

---

## 2. Configurazione delle Variabili d'Ambiente (`.env`)

Per ragioni di sicurezza e per evitare il tracciamento di chiavi private nei sistemi di controllo versione (Git), l'applicazione isola le credenziali sensibili destinate ai servizi esterni di intelligenza artificiale.

1. Navigare all'interno della cartella radice del **backend**.
2. Creare un file nominato `.env`.
3. Popolare il file inserendo la chiave crittografica per l'SDK di Groq:

```bash
# Chiave crittografica di autenticazione per l'SDK di Groq (Llama 3.3)
GROQ_API_KEY=gsk_vostro_token_segreto_api_groq
