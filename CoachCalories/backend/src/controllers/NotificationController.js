// 1. NOTA LE GRAFFE: devono esserci perché abbiamo usato module.exports = { notificationModel }
const mongoose = require('mongoose');
const { notificationModel } = require('../models/notificationModel');
const { userModel } = require('../models/userModel');

// 1. RECUPERA NOTIFICHE NON LETTE (GET) - Aggiornato con filtri flessibili per l'Admin
exports.getNotifications = async (req, res) => {
    try {
        const { recipient } = req.params;

        // Creiamo un array di possibili destinatari
        let targetRecipients = [recipient];

        // Se chi interroga è l'admin, o se viene cercata l'email dell'admin, uniamo i target
        if (recipient === 'admin' || recipient === 'federico@coach.it' || recipient === 'Federico') {
            targetRecipients = ['admin', 'federico@coach.it', 'Federico'];
        }

        const notifications = await notificationModel.find({ 
            recipient: { $in: targetRecipients }, 
            read: false 
        }).sort({ createdAt: -1 });

        res.status(200).json(notifications);
    } catch (err) {
        console.error("Errore recupero notifiche:", err);
        res.status(500).json({ error: "Errore nel recupero notifiche" });
    }
};

exports.getAllNotifications = async (req, res) => {
    try {
        const { recipient } = req.params; 

        // Creiamo la lista dei target. Se l'utente è l'admin, deve vedere TUTTO ciò che è indirizzato a lui
        let targetRecipients = [recipient];

        if (recipient === 'admin' || recipient === 'federico@coach.it' || recipient === 'Federico') {
            targetRecipients = ['admin', 'federico@coach.it', 'Federico'];
        }

        // L'operatore $in di Mongoose prende qualsiasi notifica che abbia come recipient uno dei valori nell'array
        const notifications = await notificationModel.find({ 
            recipient: { $in: targetRecipients }
        }).sort({ createdAt: -1 }); 

        res.status(200).json(notifications);
    } catch (err) {
        console.error("Errore recupero storico notifiche:", err);
        res.status(500).json({ error: "Errore nel recupero dello storico" });
    }
};

// 2. SEGNA COME LETTE (PUT)
exports.markAsRead = async (req, res) => {
    try {
        const { recipient } = req.params;
        await notificationModel.updateMany(
            { recipient: recipient, read: false },
            { $set: { read: true } }
        );
        res.status(200).json({ success: true, message: "Notifiche aggiornate" });
    } catch (err) {
        console.error("Errore aggiornamento:", err);
        res.status(500).json({ error: "Errore aggiornamento notifiche" });
    }
};

// Segna una singola notifica come letta
exports.markAsReadOne = async (req, res) => {
    try {
        const { id } = req.params; // Prende l'ID dall'URL
        
        const updated = await notificationModel.findByIdAndUpdate(
            id, 
            { read: true }, 
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: "Notifica non trovata nel DB" });
        }

        res.status(200).json({ success: true, message: "Notifica segnata come letta" });
    } catch (err) {
        console.error("Errore markAsReadOne:", err);
        res.status(500).json({ error: "Errore interno del server" });
    }
};

exports.createInternalNotification = async (recipient, title, message, type = 'info') => {
    try {
        const newNote = new notificationModel({
            recipient,
            title,
            message,
            type
        });
        
        // Salviamo e otteniamo l'oggetto completo dal database
        const savedNote = await newNote.save();
        
        console.log(`✅ Notifica creata nel DB (ID: ${savedNote._id}) per: ${recipient}`);
        
        return savedNote; // 🌟 RESTITUISCE TUTTO IL DOCUMENTO
    } catch (err) {
        console.error("❌ Errore creazione notifica DB:", err);
        return null; // Restituiamo null in caso di errore
    }
};

// ELIMINA DEFINITIVAMENTE UNA NOTIFICA
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await notificationModel.findByIdAndDelete(id);
        
        if (!deleted) return res.status(404).json({ error: "Notifica non trovata" });
        
        res.status(200).json({ success: true, message: "Notifica eliminata dal DB" });
    } catch (err) {
        res.status(500).json({ error: "Errore durante l'eliminazione" });
    }
};

exports.sendDailyReminder = async (io) => {
    try {
        console.log("🕒 [CRON] Avvio invio promemoria iper-personalizzato...");
        
        const diaryModel = mongoose.models.Diary || mongoose.model('Diary');

        const users = await userModel.find({}); 
        if (!users || users.length === 0) return;
        
        // 1. Generiamo la data di oggi nel formato "AAAA-MM-GG" identico al tuo DB (es: "2026-05-19")
        const oggi = new Date();
        const anno = oggi.getFullYear();
        const mese = String(oggi.getMonth() + 1).padStart(2, '0');
        const giorno = String(oggi.getDate()).padStart(2, '0');
        const dataStringaOggi = `${anno}-${mese}-${giorno}`;

        for (const user of users) {
            if (!user.username) continue;

            let tdeeTarget = 2000;
            let proteineTarget = 60;

            // 2. Calcolo dei target reali sulla fisionomia dell'utente
            if (user.physiologicalHistory && user.physiologicalHistory.length > 0) {
                const fisionomia = user.physiologicalHistory[user.physiologicalHistory.length - 1];
                const { weight, height, age, gender, activityLevel } = fisionomia;

                let bmr = 0;
                if (gender === 'M') {
                    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
                } else {
                    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
                }

                let pal = 1.2;
                if (activityLevel === 'light') pal = 1.375;
                if (activityLevel === 'moderate') pal = 1.55;
                if (activityLevel === 'very') pal = 1.725;
                if (activityLevel === 'extra') pal = 1.9;

                tdeeTarget = Math.round(bmr * pal);
                proteineTarget = Math.round(weight * 1.5);
            }

            // 3. 🌟 QUERY SULLA STRINGA DELLA DATA CORRENTE ("date")
            const diarioOggi = await diaryModel.findOne({
                username: user.username, 
                date: dataStringaOggi
            });

            // Estraggo i dati dall'oggetto "totals" se il diario esiste, altrimenti a zero
            let totalKcal = 0;
            let totalProteine = 0;

            if (diarioOggi && diarioOggi.totals) {
                totalKcal = Number(diarioOggi.totals.calorie) || 0;
                totalProteine = Number(diarioOggi.totals.proteine_g) || 0;
            }

            console.log(`🔍 [DEBUG CRON] Utente: ${user.username} | Data cercata: ${dataStringaOggi} | Trovato diario? ${diarioOggi ? 'SÌ' : 'NO'} | Kcal: ${totalKcal}`);

            // 4. Generiamo il messaggio su misura basandoci sulla sua fisionomia
            let titolo = "📊 Bilancio Giornaliero";
            let messaggio = "";
            let tipoNotifica = "info";

            const pctCalorie = (totalKcal / tdeeTarget) * 100;
            const pctProteine = (totalProteine / proteineTarget) * 100;

            // Se non c'è il diario, o l'array cibi è vuoto, o le calorie sono a zero
            if (!diarioOggi || !diarioOggi.foods || diarioOggi.foods.length === 0 || totalKcal === 0) {
                messaggio = `Ciao ${user.username}, la giornata sta per finire e non hai ancora segnato nulla nel diario. Ricordati di inserire i dati di oggi! 📝`;
                tipoNotifica = "error"; 
            } else if (pctCalorie < 50) {
                messaggio = `Ciao ${user.username}! Finora hai assunto ${totalKcal} Kcal, sei solo al ${Math.round(pctCalorie)}% del tuo target giornaliero calcolato sulla tua fisionomia (${tdeeTarget} Kcal). Ricordati di cenare adeguatamente! 🍽️`;
                tipoNotifica = "warning";
            } else if (pctProteine < 60) {
                messaggio = `Ottimo lavoro con le calorie oggi, ${user.username}! Sei a quota ${totalKcal} Kcal, ma le tue proteine sono ferme a ${totalProteine}g (Il tuo target ideale è ${proteineTarget}g). Dai priorità alle proteine stasera! 🥚`;
                tipoNotifica = "warning";
            } else {
                messaggio = `Grande giornata, ${user.username}! Hai assunto ${totalKcal} Kcal (${Math.round(pctCalorie)}% del tuo target) e ${totalProteine}g di proteine. Sei perfettamente in linea! 🎯`;
                tipoNotifica = "success";
            }

            // 5. Salviamo la notifica nel DB
            const newNotification = new notificationModel({
                recipient: user.email || user.username, 
                title: titolo,
                message: messaggio,
                type: tipoNotifica,
                read: false,
                createdAt: new Date()
            });

            const savedNote = await newNotification.save();

            // 6. Spediamo live via Socket
            if (io) {
                const room = user.email || user.username;
                io.to(room).emit('esito-proposta', {
                    id: savedNote._id,
                    title: titolo,
                    message: messaggio,
                    type: tipoNotifica
                });
            }
        }
        console.log(`✅ [CRON] Promemoria fisionomici elaborati per tutti gli utenti.`);
    } catch (err) {
        console.error("❌ [CRON] Errore nel promemoria:", err.message);
    }
};