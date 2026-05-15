<template>
  <div class="container mt-5 mb-5">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="display-6 fw-bold text-success">📬 Centro Notifiche</h1>
        <p class="text-white-50">Resta aggiornato sulle attività dell'applicazione e i promemoria di dieta sostenibile.</p>
      </div>
      <button class="btn btn-outline-secondary btn-sm" @click="$emit('navigate', 'Home')">
        ⬅ Torna alla Home
      </button>
    </div>

    <div class="card bg-dark text-white border-secondary shadow-lg rounded-4 p-4">
      
      <div v-if="notifications.length === 0" class="text-center py-5">
        <h1 class="display-1 text-muted opacity-25 mb-3">📭</h1>
        <h5 class="text-muted">Nessuna notifica presente al momento.</h5>
        <p class="text-white-50 small">Le notifiche push appariranno qui in tempo reale non appena il server manderà aggiornamenti live.</p>
      </div>

      <div v-else class="list-group list-group-flush">
        <div 
          v-for="(note, index) in notifications" 
          :key="index" 
          class="list-group-item bg-transparent text-white border-secondary py-3 px-0 d-flex justify-content-between align-items-start animate-fade-in"
        >
          <div class="me-auto">
            <div class="d-flex align-items-center mb-1">
              <span 
                class="badge me-2" 
                :class="{
                  'bg-success': note.type === 'success',
                  'bg-danger': note.type === 'error',
                  'bg-info': note.type === 'info'
                }"
              >
                {{ note.title }}
              </span>
              <small class="text-muted">{{ note.time }}</small>
            </div>
            <p class="mb-0 text-white-50 fs-5">{{ note.message }}</p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import axios from 'axios'; // 🌟 Fondamentale

const emit = defineEmits(['navigate']);
const notifications = ref([]);

// Funzione per recuperare i dettagli dell'utente
const getAuthDetails = () => {
  return {
    userGrade: localStorage.getItem("authGrade"),
    userEmail: localStorage.getItem("userEmail")
  };
};

// 🌟 CARICAMENTO DAL DATABASE
const fetchAllNotifications = async () => {
  const { userGrade, userEmail } = getAuthDetails();
  const recipient = userGrade === 'admin' ? 'admin' : userEmail;

  if (!recipient) return;

  try {
    // Nota: qui potresti voler creare una rotta nel backend che restituisce TUTTE le notifiche
    // (sia lette che non) per il centro notifiche. Per ora usiamo quella esistente.
    const res = await axios.get(`http://localhost:3000/api/notifications/${recipient}`);
    
    notifications.value = res.data.map(n => ({
      title: n.title,
      message: n.message,
      type: n.type,
      time: new Date(n.createdAt).toLocaleString([], { 
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
      })
    }));
  } catch (err) {
    console.error("❌ Errore fetch centro notifiche:", err);
  }
};

onMounted(() => {
  // 1. Carica lo storico reale dal DB
  fetchAllNotifications();

  // 2. WebSocket per aggiornamenti "live" mentre guardi la pagina
  const socket = io('http://localhost:3000');
  const { userGrade } = getAuthDetails();

  // Registrazione stanza socket
  if (userGrade) {
    socket.emit('registra-utente', { userGrade });
  }

  const addNotification = (title, message, type = 'success') => {
    notifications.value.unshift({
      title,
      message,
      type,
      time: new Date().toLocaleString([], { 
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
      })
    });
  };

  // --- ASCOLTO EVENTI SERVER ---
  socket.on('notifica-serale', (data) => {
    addNotification("Promemoria", data.message, 'info');
  });

  socket.on('nuova-proposta-admin', (data) => {
    if (userGrade === 'admin') {
      addNotification("Nuova Proposta", data.message, 'success');
    }
  });

  socket.on('proposta-gestita-utente', (data) => {
    if (userGrade !== 'admin') {
      const title = data.status === 'approvata' ? "Approvata! ✅" : "Rifiutata ❌";
      addNotification(title, data.message, data.status === 'approvata' ? 'success' : 'error');
    }
  });

  onUnmounted(() => {
    socket.disconnect();
  });
});
</script>

<style scoped>
/* Animazione fluida quando appare una nuova notifica live */
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>