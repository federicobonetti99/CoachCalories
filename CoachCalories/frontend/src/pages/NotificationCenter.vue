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

const emit = defineEmits(['navigate']);
const notifications = ref([]);

onMounted(() => {
  // 1. Recupera le notifiche vecchie salvate nel browser per non perderle al refresh
  const savedNotes = localStorage.getItem('app_notifications');
  if (savedNotes) {
    notifications.value = JSON.parse(savedNotes);
  }

  // 2. Connessione WebSocket al backend Node.js
  const socket = io('http://localhost:3000');
  const userGrade = localStorage.getItem("authGrade");

  // Funzione interna per aggiungere la notifica in cima all'elenco
  const addNotification = (title, message, type = 'success') => {
    notifications.value.unshift({
      title,
      message,
      type,
      time: new Date().toLocaleTimeString()
    });
    // Salva lo storico nel localStorage
    localStorage.setItem('app_notifications', JSON.stringify(notifications.value));
  };

  // --- ASCOLTO EVENTI SERVER PUSH ---

  // Evento 1: Promemoria Dietetico Serale (per tutti)
  socket.on('notifica-serale', (data) => {
    addNotification("Promemoria", data.message, 'info');
  });

  // Evento 2: Notifica per l'Admin (Nuova proposta inserita da un utente)
  socket.on('nuova-proposta-admin', (data) => {
    if (userGrade === 'admin') {
      addNotification("Nuova Proposta", data.message, 'success');
    }
  });

  // Evento 3: Notifica per l'Utente (Esito della proposta gestita dall'admin)
  socket.on('proposta-gestita-utente', (data) => {
    if (userGrade !== 'admin') {
      const title = data.status === 'approvata' ? "Approvata! ✅" : "Rifiutata ❌";
      addNotification(title, data.message, data.status === 'approvata' ? 'success' : 'error');
    }
  });

  // Disconnette il socket quando l'utente cambia pagina per liberare memoria
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