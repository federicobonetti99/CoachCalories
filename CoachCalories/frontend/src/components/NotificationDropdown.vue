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
              class="badge fw-bold" 
              :class="{
                'bg-success text-white': note.type === 'success',
                'bg-danger text-white': note.type === 'error',
                'bg-info text-dark': note.type === 'info'
              }" 
              style="font-size: 0.75rem;"
            >
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

// 🌟 FUNZIONE DI SINCRONIZZAZIONE (Il trucco per barare)
// Questa funzione viene eseguita quando il NotificationCenter lancia l'urlo
const handleGlobalSync = (event) => {
  const idLetto = event.detail.id;
  
  // Cerchiamo se quella notifica è presente nel dropdown
  const index = liveNotifications.value.findIndex(n => n.id === idLetto);
  
  if (index !== -1) {
    // Se c'è, la rimuoviamo (perché nel dropdown vogliamo solo le non lette)
    liveNotifications.value.splice(index, 1);
    unreadCount.value = liveNotifications.value.length;
    console.log(`🔄 Dropdown sincronizzato: rimossa notifica ${idLetto}`);
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

const markAsRead = async (id, index) => {
  if (!id) {
    liveNotifications.value.splice(index, 1);
    unreadCount.value--;
    return;
  }

  try {
    await axios.put(`http://localhost:3000/api/notifications/read-one/${id}`);
    liveNotifications.value.splice(index, 1);
    unreadCount.value--;
    
    // (Opzionale) Se clicchi dal dropdown, potresti voler avvisare il centro notifiche
    // ma di solito il centro notifiche si aggiorna al refresh o lo tieni così.
  } catch (err) {
    console.error("❌ Errore nel segnare la notifica come letta:", err);
  }
};

onMounted(() => {
  fetchNotifications();
  
  // 🌟 ASCOLTO L'EVENTO GLOBALE
  window.addEventListener('notifica-letta-global', handleGlobalSync);

  const socket = io('http://localhost:3000');
  
  const registraSuSocket = () => {
    const { userGrade } = getAuthDetails();
    if (userGrade) socket.emit('registra-utente', { userGrade });
  };

  registraSuSocket();

  socket.on('nuova-proposta-admin', (data) => {
    const { userGrade } = getAuthDetails();
    if (userGrade === 'admin') {
      liveNotifications.value.unshift({
        id: data.id, 
        title: "Nuova Proposta",
        message: data.message,
        type: 'success',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      unreadCount.value++;
    }
  });

  onUnmounted(() => {
    socket.disconnect();
    // 🌟 PULIZIA: smetto di ascoltare quando il componente viene distrutto
    window.removeEventListener('notifica-letta-global', handleGlobalSync);
  });
});
</script>