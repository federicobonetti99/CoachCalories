const { userModel } = require('../models/userModel');
const jwt = require('jsonwebtoken');

exports.login = (req, res) => {
    const { email, password } = req.body; 

    userModel.findOne({ email: email }) 
        .then(user => {
            if (!user) {
                return res.status(401).json({ success: false, message: 'Email non trovata nel sistema' });
            }

            if (user.password === password) {
                // Generazione del token con la chiave 'IL_TUO_SEGRETO'
                const token = jwt.sign(
                    { id: user._id, email: user.email, grade: user.authenticationGrade },
                    'IL_TUO_SEGRETO', 
                    { expiresIn: '1d' }
                );

                res.json({
                    success: true,
                    username: user.username,
                    email: user.email,
                    authenticationGrade: user.authenticationGrade,
                    token: token
                });
            } else {
                res.status(401).json({ success: false, message: 'Password errata' });
            }
        })
        .catch(err => {
            res.status(500).json({ success: false, message: 'Errore del server' });
        });
};