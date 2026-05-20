const mongoose = require('mongoose');
const { notificationModel } = require('../models/notificationModel');
const { userModel } = require('../models/userModel');

// Utility interna per mappare i destinatari dell'admin
const getTargetRecipients = (recipient) => {
    if (recipient === 'admin' || recipient === 'federico@coach.it' || recipient === 'Federico') {
        return ['admin', 'federico@coach.it', 'Federico'];
    }
    return [recipient];
};

// 1. RECUPERA NOTIFICHE NON LETTE (PER IL DROPDOWN IN ALTO)
exports.getNotifications = async (req, res) => {
    try {
        const { recipient } = req.params;
        const targets = getTargetRecipients(recipient);

        const notifications = await notificationModel.find({ 
            recipient: { $in: targets }, 
            read: false 
        }).sort({ createdAt: -1 });

        res.status(200).json(notifications);
    } catch (err) {
        console.error("Errore recupero notifiche:", err);
        res.status(500).json({ error: "Errore nel recupero notifiche" });
    }
};

// 2. RECUPERA STORICO COMPLETO (PER IL NOTIFICATION CENTER)
exports.getAllNotifications = async (req, res) => {
    try {
        const { recipient } = req.params; 
        const targets = getTargetRecipients(recipient);

        const notifications = await notificationModel.find({ 
            recipient: { $in: targets }
        }).sort({ createdAt: -1 }); 

        res.status(200).json(notifications);
    } catch (err) {
        console.error("Errore recupero storico notifiche:", err);
        res.status(500).json({ error: "Errore nel recupero dello storico" });
    }
};

// 3. SEGNA TUTTE LE NOTIFICHE COME LETTE
exports.markAsRead = async (req, res) => {
    try {
        const { recipient } = req.params;
        const targets = getTargetRecipients(recipient);

        await notificationModel.updateMany(
            { recipient: { $in: targets }, read: false },
            { $set: { read: true } }
        );
        res.status(200).json({ success: true, message: "Notifiche aggiornate in blocco" });
    } catch (err) {
        console.error("Errore aggiornamento:", err);
        res.status(500).json({ error: "Errore aggiornamento notifiche" });
    }
};

// 4. SEGNA UNA SINGOLA NOTIFICA COME LETTA (CON EMIT SOCKET BROADCAST)
exports.markAsReadOne = async (req, res) => {
    try {
        const { id } = req.params; 
        
        const updated = await notificationModel.findByIdAndUpdate(
            id, 
            { read: true }, 
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: "Notifica non trovata nel DB" });
        }

        // Se il ponte socket esiste, spara il broadcast di avvenuta lettura
        if (req.io) {
            req.io.to('admin_room').emit('notifica-letta-broadcast', { id: id });
        }

        res.status(200).json({ success: true, message: "Notifica segnata come letta" });
    } catch (err) {
        console.error("Errore markAsReadOne:", err);
        res.status(500).json({ error: "Errore interno del server" });
    }
};

// 5. ELIMINA DEFINITIVAMENTE UNA NOTIFICA
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

// 6. CREAZIONE NOTIFICA INTERNA (UTILITY PER ALTRI CONTROLLER)
exports.createInternalNotification = async (recipient, title, message, type = 'info') => {
    try {
        const newNote = new notificationModel({
            recipient,
            title,
            message,
            type
        });
        
        const savedNote = await newNote.save();
        return savedNote; 
    } catch (err) {
        console.error("❌ Errore creazione notifica DB:", err);
        return null;
    }
};

// 7. CRON DIARIO SULLA FISIONOMIA
exports.sendDailyReminder = async (io) => {
    try {
        console.log("🕒 [CRON] Avvio invio promemoria...");
        
        const diaryModel = mongoose.models.Diary || mongoose.model('Diary');
        const users = await userModel.find({}); 
        if (!users || users.length === 0) return;
        
        const oggi = new Date();
        const anno = oggi.getFullYear();
        const mese = String(oggi.getMonth() + 1).padStart(2, '0');
        const g = String(oggi.getDate()).padStart(2, '0');
        const dataStringaOggi = `${anno}-${mese}-${g}`;

        for (const user of users) {
            if (!user.username) continue;

            let tdeeTarget = 2000;
            let proteineTarget = 60;

            if (user.physiologicalHistory && user.physiologicalHistory.length > 0) {
                const fisionomia = user.physiologicalHistory[user.physiologicalHistory.length - 1];
                const { weight, height, age, gender, activityLevel } = fisionomia;

                let bmr = (10 * weight) + (6.25 * height) - (5 * age);
                if (gender === 'M') {
                    bmr += 5;
                } else {
                    bmr -= 161;
                }

                let pal = 1.2;
                if (activityLevel === 'light') pal = 1.375;
                if (activityLevel === 'moderate') pal = 1.55;
                if (activityLevel === 'very') pal = 1.725;
                if (activityLevel === 'extra') pal = 1.9;

                tdeeTarget = Math.round(bmr * pal);
                proteineTarget = Math.round(weight * 1.5);
            }

            const diarioOggi = await diaryModel.findOne({
                username: user.username, 
                date: dataStringaOggi
            });

            let totalKcal = 0;
            let totalProteine = 0;

            if (diarioOggi && diarioOggi.totals) {
                totalKcal = Number(diarioOggi.totals.calorie) || 0;
                totalProteine = Number(diarioOggi.totals.proteine_g) || 0;
            }

            let titolo = "📊 Bilancio Giornaliero";
            let messaggio = "";
            let tipoNotifica = "info";

            const pctCalorie = (totalKcal / tdeeTarget) * 100;
            const pctProteine = (totalProteine / proteineTarget) * 100;

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

            const destinatarioSicuro = (user.email === 'federico@coach.it' || user.username === 'Federico') ? 'admin' : user.email;

            const newNotification = new notificationModel({
                recipient: destinatarioSicuro, 
                title: titolo,
                message: messaggio,
                type: tipoNotifica,
                read: false,
                createdAt: new Date()
            });

            const savedNote = await newNotification.save();

            if (io) {
                if (destinatarioSicuro === 'admin') {
                    io.to('admin_room').emit('nuova-proposta-admin', {
                        id: savedNote._id,
                        title: titolo,
                        message: messaggio,
                        type: tipoNotifica
                    });
                } else {
                    io.to(user.email).emit('esito-proposta', {
                        id: savedNote._id,
                        title: titolo,
                        message: messaggio,
                        type: tipoNotifica
                    });
                }
            }
        }
    } catch (err) {
        console.error("❌ [CRON] Errore nel promemoria:", err.message);
    }
};

exports.deleteAllNotifications = async (req, res) => {
    try {
        const { recipient } = req.params;
        const targets = getTargetRecipients(recipient);

        // Cancelliamo tutte le notifiche che corrispondono ai target dell'utente
        await notificationModel.deleteMany({ recipient: { $in: targets } });

        // Fischio globale via socket per svuotare i componenti live sul frontend
        if (req.io) {
            req.io.to('admin_room').emit('notifiche-svuotate-broadcast');
        }

        res.status(200).json({ success: true, message: "Tutte le notifiche sono stati eliminate dal DB" });
    } catch (err) {
        console.error("Errore svuotamento notifiche:", err);
        res.status(500).json({ error: "Errore durante lo svuotamento totale" });
    }
};