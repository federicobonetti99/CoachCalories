const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// 1. Importiamo il router con un nome coerente
const foodRouter = require('./src/routes/foodsRoutes'); 

// 2. Connessione al database (dbFoods deve essere uguale a quello dello script SH)
mongoose.connect('mongodb://127.0.0.1:27017/dbFoods')
  .then(() => console.log('Connessione a MongoDB riuscita!'))
  .catch(err => console.error('Errore di connessione a MongoDB:', err));

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 3. Usiamo il router (Assicurati che il nome qui coincida con la variabile sopra)
app.use('/foods', foodRouter);

// Avvio del server
app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
