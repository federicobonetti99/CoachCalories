\section{Deployment}
Il rilascio e la configurazione di \textit{CoachCalories} sono stati ottimizzati per consentire un'esecuzione rapida in ambiente locale, isolando le sole credenziali strettamente confidenziali per proteggere l'accesso ai servizi esterni di intelligenza artificiale.

% ========================================================================
% Configurazione .env
% ========================================================================
\subsection{Configurazione delle Variabili d'Ambiente (.env)}
Per evitare il tracciamento di chiavi private nei sistemi di controllo versione e garantire la sicurezza dei token di accesso, l'applicazione si affida a un file \texttt{.env} memorizzato nella radice del backend. Nel contesto specifico del progetto, l'unica variabile d'ambiente esternalizzata è la chiave di autorizzazione per l'infrastruttura di inferenza, come illustrato di seguito:

\begin{lstlisting}[language=bash, caption={Struttura del file .env per l'isolamento delle credenziali del chatbot.}]
# Chiave crittografica di autenticazione per l'SDK di Groq (Llama 3.3)
GROQ_API_KEY=gsk_vostro_token_segreto_api_groq
\end{lstlisting}

Il modulo \texttt{dotenv} intercetta questo file all'avvio del server Express e inietta il valore nel runtime di Node.js, rendendolo accessibile all'interno di \texttt{chatbotController.js} tramite la variabile globale \texttt{process.env.GROQ_API_KEY}.

Per l'attivazione di questa componente strategica, l'operatore può configurare una propria chiave API personale, generata autonomamente tramite la piattaforma sviluppatori di Groq; in alternativa, qualora si desideri testare il sistema in fase di valutazione senza configurare un account di terze parti, è possibile richiedere la chiave di accesso temporanea direttamente al creatore del sito.

Al contrario, per semplificare le procedure di deployment ed esecuzione in ambiente di sviluppo locale, parametri quali la porta del server (impostata sulla porta standard \texttt{3000}) e l'indirizzo di connessione unificato al database MongoDB (\texttt{mongodb://127.0.0.1:27017/CoachCalories}) sono stati cablati direttamente (\textit{hardcoded}) all'interno del file di ingresso \texttt{index.js}. Questa scelta progettuale riduce la complessità di configurazione iniziale senza pregiudicare la stabilità delle comunicazioni client-server.

% ========================================================================
% Messa in funzione
% ========================================================================
\subsection{Messa in Funzione Locale}
L'installazione e l'esecuzione dell'ecosistema richiedono l'attivazione parallela dei due livelli disaccoppiati dell'applicazione, operanti secondo un'architettura client-server:

\begin{itemize}
    \item \textbf{Inizializzazione del Backend Express.js:} Richiede il caricamento preliminare dei moduli lato server mediante il gestore di pacchetti Node (\texttt{npm install}) e il successivo avvio del servizio. All'inizializzazione, lo script \texttt{index.js} apre la pipeline dei middleware globali, stabilisce la connessione con il container MongoDB locale e valida la presenza della chiave Groq prima di mettersi in ascolto delle richieste HTTP.
    \item \textbf{Esecuzione del Frontend Vite.js:} Sul versante client, l'esecuzione del server di sviluppo locale gestisce il routing di stato reattivo e indirizza le richieste asincrone della libreria Axios verso la porta \texttt{3000} del backend, completando l'architettura operativa della piattaforma.
\end{itemize}
