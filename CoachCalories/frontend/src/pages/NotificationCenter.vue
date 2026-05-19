<template>
  <div class="container mt-5 mb-5">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="display-6 fw-bold text-success">📬 Centro Notifiche</h1>
        <p class="text-white-50">Resta aggiornato sulle attività dell'applicazione e i promemoria di dieta sostenibile.</p>
      </div>
      <div class="d-flex gap-2">
        <button 
          v-if="notifications.length > 0"
          class="btn btn-outline-danger btn-sm fw-bold d-flex align-items-center gap-1" 
          @click="clearAllNotifications"
        >
          🗑️ Cancella Tutto
        </button>
        <button class="btn btn-outline-secondary btn-sm" @click="$emit('navigate', 'Home')">
          ⬅ Torna alla Home
        </button>
      </div>
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
          :key="note.id || index" 
          @click="handleNotificationClick(note)"
          class="list-group-item bg-transparent text-white border-secondary py-3 px-3 d-flex justify-content-between align-items-center animate-fade-in notification-row"
          :class="{ 'is-read': note.read, 'is-unread': !note.read }"
        >
          <div class="me-auto">
            <div class="d-flex align-items-center mb-1">
              <span 
                class="badge me-2 d-flex align-items-center" 
                :class="note.read ? 'bg-secondary opacity-50' : {
                  'bg-primary': note.title === 'Nuova Proposta' || note.title === 'Proposta Approvata' || note.title === 'Proposta Rifiutata',
                  'bg-success': note.type === 'success' && note.title !== 'Nuova Proposta',
                  'bg-info': note.type === 'info',
                  'bg-danger': note.type === 'error'
                }"
              >
                <span v-if="note.title === 'Nuova Proposta'" class="me-1">🍎</span>
                <span v-else-if="note.type === 'success'" class="me-1">✅</span>
                <span v-else-if="note.type === 'info'" class="me-1">ℹ️</span>
                <span v-else-if="note.type === 'error'" class="me-1">⚠️</span>
                
                {{ note.title }}
              </span>

              <small :class="note.read ? 'text-muted fw-normal' : 'text-muted fw-bold'">
                {{ note.time }}
              </small>
              
              <span v-if="!note.read" class="badge rounded-pill bg-warning text-dark ms-2 shadow-sm" style="font-size: 0.65rem;">
                NUOVA
              </span>
            </div>
            
            <p class="mb-0 fs-5 message-text" :class="note.read ? 'text-white-50 fw-normal' : 'text-white fw-bold'">
              {{ note.message }}
            </p>
          </div>

          <div class="ms-3">
            <button 
              class="btn btn-outline-danger btn-sm border-0 rounded-circle p-2 shadow-none trash-btn" 
              @click.stop="deleteNotification(note.id, index)"
              title="Elimina definitivamente"
            >
              <span style="font-size: 1.2rem;">🗑️</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import axios from 'axios';

const emit = defineEmits(['navigate']);
const notifications = ref([]);

const getAuthDetails = () => {
  return {
    userGrade: localStorage.getItem("authGrade"),
    userEmail: localStorage.getItem("userEmail")
  };
};

const fetchAllNotifications = async () => {
  const { userGrade, userEmail } = getAuthDetails();
  const recipient = userGrade === 'admin' ? 'admin' : userEmail; 
  if (!recipient) return;

  try {
    const res = await axios.get(`http://localhost:3000/api/notifications/all/${recipient}`);
    notifications.value = res.data.map(n => ({
      id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.read, 
      time: new Date(n.createdAt).toLocaleString([], { 
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    }));
  } catch (err) {
    console.error("❌ Errore fetch storico:", err);
  }
};

const deleteNotification = async (id, index) => {
  if (!confirm("Vuoi eliminare definitivamente questa notifica?")) return;
  try {
    await axios.delete(`http://localhost:3000/api/notifications/${id}`);
    notifications.value.splice(index, 1);
  } catch (err) {
    console.error("❌ Errore eliminazione:", err);
  }
};

// 🌟 NUOVA: FA LA CHIAMATA PER EMETTERE LA CANCELLAZIONE TOTALE
const clearAllNotifications = async () => {
  if (!confirm("Sei sicuro di voler eliminare TUTTE le notifiche dello storico? Questa azione è irreversibile.")) return;
  const { userGrade, userEmail } = getAuthDetails();
  const recipient = userGrade === 'admin' ? 'admin' : userEmail;

  try {
    await axios.delete(`http://localhost:3000/api/notifications/all/${recipient}`);
    notifications.value = []; // Svuota la pagina locale al volo
  } catch (err) {
    console.error("❌ Errore svuotamento totale:", err);
  }
};

const handleNotificationClick = async (note) => {
  if (note.read) return;

  try {
    await axios.put(`http://localhost:3000/api/notifications/read-one/${note.id}`);
    
    const index = notifications.value.findIndex(n => n.id === note.id);
    if (index !== -1) {
      notifications.value[index] = { ...notifications.value[index], read: true };
    }
  } catch (err) {
    console.error(err);
  }
};

onMounted(() => {
  fetchAllNotifications();
  const socket = io('http://localhost:3000');
  const { userGrade, userEmail } = getAuthDetails();

  if (userGrade || userEmail) {
    socket.emit('registra-utente', { userGrade, userEmail });
  }

  // Ascolta il broadcast di lettura singola
  socket.on('notifica-letta-broadcast', (data) => {
    const index = notifications.value.findIndex(n => n.id === data.id);
    if (index !== -1) {
      notifications.value[index] = { ...notifications.value[index], read: true };
    }
  });

  // 🌟 NUOVO: Ascolta se qualcuno (es. il dropdown o un altro pannello admin) svuota tutto
  socket.on('notifiche-svuotate-broadcast', () => {
    notifications.value = [];
  });

  socket.on('nuova-proposta-admin', (data) => {
    if (userGrade === 'admin') {
      notifications.value.unshift({
        id: data.id, 
        title: data.title || "Nuova Proposta",
        message: data.message,
        type: data.type || 'success',
        read: false,
        time: new Date().toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  onUnmounted(() => socket.disconnect());
});
</script>

<style scoped>
.list-group-item {
  transition: all 0.3s ease-in-out;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.is-unread {
  border-left: 4px solid #198754 !important;
  padding-left: 15px !important;
  cursor: pointer;
}

.is-read {
  opacity: 0.5;
  border-left: 4px solid transparent !important;
  cursor: default;
}

.list-group-item:hover {
  background-color: rgba(255, 255, 255, 0.03) !important;
}

.btn-outline-danger:hover {
  background-color: #dc3545;
  color: white;
  transform: scale(1.1);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.animate-fade-in {
  animation: slideIn 0.4s ease-out forwards;
}
</style>