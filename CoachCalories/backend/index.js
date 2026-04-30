const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// 1. Importiamo i router
const foodRouter = require('./src/routes/foodsRoutes'); 
const authRouter = require('./src/routes/authRoutes');

// 2. Connessione al database UNIFICATO
// Abbiamo cambiato 'dbFoods' in 'CoachCalories' per trovare sia utenti che cibi
mongoose.connect('mongodb://127.0.0.1:27017/CoachCalories')
  .then(() => console.log('Connessione a CoachCalories riuscita!'))
  .catch(err => console.error('Errore di connessione a MongoDB:', err));

const app = express();

// Middleware (come da slide: gestiscono la comunicazione HTTP)
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 3. Definizione delle rotte (Entry-points delle API)
app.use('/foods', foodRouter);
app.use('/api/auth', authRouter);

// Avvio del server
app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
