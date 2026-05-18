const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// 1. Import Router
const foodRouter = require('./src/routes/foodsRoutes'); 
const authRouter = require('./src/routes/authRoutes');
const diaryRoutes = require('./src/routes/diaryRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes'); 

// 2. Database
mongoose.connect('mongodb://127.0.0.1:27017/CoachCalories')
  .then(() => console.log('✅ MongoDB Connesso'))
  .catch(err => console.error('❌ Errore MongoDB:', err));

const app = express();

// 3. MIDDLEWARE GLOBALI (Sempre in cima a tutto!)
app.use(cors()); // Attiva il CORS subito per evitare blocchi
app.use(express.json());
app.use(express.static('public'));

// 4. SERVER HTTP + SOCKET.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // URL del tuo frontend Vite
        methods: ["GET", "POST"]
    }
});

// 5. IL PONTE PER I CONTROLLER (Dopo aver definito 'io')
app.use((req, res, next) => {
    req.io = io;
    next();
});

// 6. ROTTE (Sotto il ponte, così possono usare req.io)
app.use('/foods', foodRouter);
app.use('/api/auth', authRouter);
app.use('/api/diary', diaryRoutes);
app.use('/api/notifications', notificationRoutes); 

// 7. LOGICA WEBSOCKET
io.on('connection', (socket) => {
    console.log(`🔌 Connesso: ${socket.id}`);

    socket.on('registra-utente', (data) => {
        if (!data) return;

        // 1. Se è admin, entra nella stanza degli admin
        if (data.userGrade === 'admin') {
            socket.join('admin_room');
            console.log(`👑 Admin ${socket.id} in admin_room`);
        }

        // 2. 🌟 SE C'È L'EMAIL, creiamo la stanza privata per l'utente
        // Questo permette al backend di fare req.io.to(email).emit(...)
        if (data.userEmail) {
            socket.join(data.userEmail);
            console.log(`👤 Utente ${socket.id} inserito nella stanza privata: ${data.userEmail}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ Disconnesso: ${socket.id}`);
    });
});

// 8. LISTEN SUL SERVER UNIFICATO
server.listen(3000, () => {
    console.log('🚀 Server unificato attivo sulla porta 3000');
});