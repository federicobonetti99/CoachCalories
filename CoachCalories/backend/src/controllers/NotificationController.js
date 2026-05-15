// 1. NOTA LE GRAFFE: devono esserci perché abbiamo usato module.exports = { notificationModel }
const { notificationModel } = require('../models/notificationModel');

// 1. RECUPERA NOTIFICHE (GET)
exports.getNotifications = async (req, res) => {
    try {
        const { recipient } = req.params;
        const notifications = await notificationModel.find({ 
            recipient: recipient, 
            read: false 
        }).sort({ createdAt: -1 });

        res.status(200).json(notifications);
    } catch (err) {
        console.error("Errore recupero notifiche:", err);
        res.status(500).json({ error: "Errore nel recupero notifiche" });
    }
};

// Recupera TUTTE le notifiche (lette e non lette) per la pagina Centro Notifiche
exports.getAllNotifications = async (req, res) => {
    try {
        const { recipient } = req.params;
        const notifications = await notificationModel.find({ 
            recipient: recipient 
        }).sort({ createdAt: -1 }); // Sempre le più recenti in alto

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