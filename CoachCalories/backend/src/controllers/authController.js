const { userModel } = require('../models/userModel');

exports.login = (req, res) => {
    const { email, password } = req.body; 

    userModel.findOne({ email: email }) 
        .then(user => {
            if (!user) {
                return res.status(401).json({ success: false, message: 'Email non trovata nel sistema' });
            }

            if (user.password === password) {
                res.json({
                    success: true,
                    username: user.username, // Restituiamo 'Federico'
                    authenticationGrade: user.authenticationGrade
                });
            } else {
                res.status(401).json({ success: false, message: 'Password errata' });
            }
        })
        .catch(err => {
            res.status(500).json({ success: false, message: 'Errore del server' });
        });
};