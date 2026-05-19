<template>
  <div class="dropdown">
    <button 
      class="btn btn-link text-decoration-none p-0 position-relative mailbox-btn shadow-none" 
      type="button" 
      data-bs-toggle="dropdown" 
      aria-expanded="false"
      style="font-size: 1.5rem; line-height: 1;"
    >
      📬
      <span 
        v-if="unreadCount > 0" 
        class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger shadow"
        style="font-size: 0.65rem;"
      >
        {{ unreadCount }}
      </span>
    </button>

    <ul class="dropdown-menu dropdown-menu-end bg-black border-secondary shadow-lg mt-2 p-0" style="width: 320px; max-height: 400px; overflow-y: auto; z-index: 1050;">
      
      <li class="p-3 border-bottom border-secondary d-flex justify-content-between align-items-center bg-dark rounded-top">
        <h6 class="text-white m-0 fw-bold fs-6">Notifiche Recenti</h6>
        <span class="badge bg-success text-white fw-bold small">Live</span>
      </li>
      
      <li v-if="liveNotifications.length === 0" class="p-4 text-center bg-black">
        <small class="d-block mb-1 text-white fw-bold fs-6">✨ Tutto tranquillo</small>
        <small class="text-white opacity-75 d-block" style="font-size: 0.8rem;">Nessun nuovo messaggio ricevuto.</small>
      </li>

      <li 
        v-for="(note, index) in liveNotifications" 
        :key="note.id" 
        @click="markAsRead(note.id, index)"
        class="p-3 border-bottom border-secondary bg-hover animate-slide-down bg-black text-start"
        style="cursor: pointer;"
      >
        <div class="d-flex flex-column w-100">
          <div class="d-flex justify-content-between align-items-center mb-2 w-100">
            <span 
              class="badge fw-bold d-flex align-items-center" 
              :class="{
                'bg-primary text-white': note.title === 'Nuova Proposta' || note.title === 'Proposta Approvata' || note.title === 'Proposta Rifiutata',
                'bg-success text-white': note.type === 'success' && note.title !== 'Nuova Proposta' && note.title !== 'Proposta Approvata',
                'bg-danger text-white': note.type === 'error' || note.title === 'Proposta Rifiutata',
                'bg-info text-dark': note.type === 'info'
              }" 
              style="font-size: 0.75rem;"
            >
              <span v-if="note.title === 'Nuova Proposta'" class="me-1">🍎</span>
              <span v-else-if="note.title === 'Proposta Approvata'" class="me-1">✅</span>
              <span v-else-if="note.title === 'Proposta Rifiutata'" class="me-1">❌</span>
              
              {{ note.title }}
            </span>
            <small class="text-white fw-bold opacity-75" style="font-size: 0.75rem;">{{ note.time }}</small>
          </div>
          
          <p class="mb-0 text-white fw-normal lh-sm style-message" style="font-size: 0.9rem; white-space: normal; word-break: break-word;">
            {{ note.message }}
          </p>
        </div>
      </li>

      <li class="p-2 text-center bg-dark rounded-bottom">
        <a 
          href="#" 
          class="text-success text-decoration-none small fw-bold d-block py-1 link-compile"
          @click.prevent="goToCenter"
        >
          Apri Centro Notifiche 📑
        </a>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import axios from 'axios';

const emit = defineEmits(['view-all']);
const liveNotifications = ref([]);
const unreadCount = ref(0);

const getAuthDetails = () => {
  return {
    userGrade: localStorage.getItem("authGrade"),
    userEmail: localStorage.getItem("userEmail")
  };
};

const goToCenter = () => {
  emit('view-all');
};

// 🌟 RICEZIONE SEGNALE DA ESTERNO (Quando clicchi sul Centro Notifiche)
const handleGlobalSync = (event) => {
  const idLetto = event.detail.id;
  const index = liveNotifications.value.findIndex(n => n.id === idLetto);
  
  if (index !== -1) {
    liveNotifications.value.splice(index, 1);
    unreadCount.value = liveNotifications.value.length;
    console.log(`🔄 Dropdown allineato: rimossa notifica ${idLetto}`);
  }
};

const fetchNotifications = async () => {
  const { userGrade, userEmail } = getAuthDetails();
  const recipient = userGrade === 'admin' ? 'admin' : userEmail;
  if (!recipient) return;

  try {
    const res = await axios.get(`http://localhost:3000/api/notifications/${recipient}`);
    liveNotifications.value = res.data.map(n => ({
      id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
    unreadCount.value = liveNotifications.value.length;
  } catch (err) {
    console.error("❌ Errore caricamento notifiche:", err);
  }
};

// 🌟 INVIO SEGNALE VERSO ESTERNO (Quando clicchi dentro il Dropdown)
// Nella funzione markAsRead lascia solo questo, SENZA CustomEvent:
const markAsRead = async (id, index) => {
  if (!id) return;
  try {
    await axios.put(`http://localhost:3000/api/notifications/read-one/${id}`);
    liveNotifications.value.splice(index, 1);
    unreadCount.value--;
  } catch (err) {
    console.error(err);
  }
};

// E aggiorna l'onMounted del dropdown così:
onMounted(() => {
  fetchNotifications();
  
  const socket = io('http://localhost:3000');
  const { userGrade, userEmail } = getAuthDetails();
  if (userGrade || userEmail) {
      socket.emit('registra-utente', { userGrade, userEmail });
  }

  // 🌟 ASCOLTA IL BROADCAST DI LETTURA DAL SERVER:
  // Se leggi una notifica dal Centro Notifiche, il server lo dice al socket, e il dropdown si svuota!
  socket.on('notifica-letta-broadcast', (data) => {
    const index = liveNotifications.value.findIndex(n => n.id === data.id);
    if (index !== -1) {
      liveNotifications.value.splice(index, 1);
      unreadCount.value = liveNotifications.value.length;
    }
  });

  socket.on('nuova-proposta-admin', (data) => {
    if (userGrade === 'admin') {
      liveNotifications.value.unshift({
        id: data.id, 
        title: data.title || "Nuova Proposta",
        message: data.message,
        type: data.type || 'success',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      unreadCount.value++;
    }
  });

  socket.on('notifiche-svuotate-broadcast', () => {
    liveNotifications.value = [];
    unreadCount.value = 0;
  });

  onUnmounted(() => socket.disconnect());
});
</script>