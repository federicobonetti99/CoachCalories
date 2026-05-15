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

// 3. FUNZIONE INTERNA (Senza req/res)
exports.createInternalNotification = async (recipient, title, message, type = 'info') => {
    try {
        const newNote = new notificationModel({
            recipient,
            title,
            message,
            type
        });
        await newNote.save();
        console.log("✅ Notifica salvata nel DB per:", recipient);
        return true;
    } catch (err) {
        console.error("❌ Errore creazione notifica DB:", err);
        return false;
    }
};