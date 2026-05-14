<template>
  <div class="dropdown">
    <button 
      class="btn btn-link text-decoration-none p-0 position-relative mailbox-btn shadow-none" 
      type="button" 
      data-bs-toggle="dropdown" 
      aria-expanded="false"
      @click="unreadCount = 0"
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
        :key="index" 
        class="p-3 border-bottom border-secondary bg-hover animate-slide-down bg-black text-start"
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

const emit = defineEmits(['view-all']);

const liveNotifications = ref([]);
const unreadCount = ref(0);

const goToCenter = () => {
  emit('view-all');
};

onMounted(() => {
  // 1. Connessione WebSocket al backend Node
  const socket = io('http://localhost:3000');
  
  // Funzione interna per recuperare i dati aggiornati dal localStorage
  const getAuthDetails = () => {
    return {
      userGrade: localStorage.getItem("authGrade"),
      userEmail: localStorage.getItem("userEmail")
    };
  };

  // 🌟 FUNZIONE DI REGISTRAZIONE SICURA
  const registraSuSocket = () => {
    const { userGrade } = getAuthDetails();
    if (userGrade) {
      socket.emit('registra-utente', { userGrade });
      console.log(`📡 [Socket] Tentativo di registrazione inviato come: ${userGrade}`);
    }
  };

  // Proviamo a registrarci subito all'avvio
  registraSuSocket();

  // 🌟 TRACCO DI SICUREZZA: Se il localStorage era in ritardo, riproviamo dopo mezzo secondo
  setTimeout(() => {
    registraSuSocket();
  }, 500);

  const addLiveNote = (title, message, type = 'success') => {
    liveNotifications.value.unshift({
      title,
      message,
      type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    unreadCount.value++;

    if (liveNotifications.value.length > 5) {
      liveNotifications.value.pop();
    }
  };

  // Ascolto dei segnali in tempo reale dal server
  socket.on('notifica-serale', (data) => {
    addLiveNote("Promemoria", data.message, 'info');
  });

  socket.on('nuova-proposta-admin', (data) => {
    // Leggiamo il grado in tempo reale per sicurezza
    const { userGrade } = getAuthDetails();
    if (userGrade === 'admin') {
      addLiveNote("Nuova Proposta", data.message, 'success');
    }
  });

  socket.on('proposta-gestita-utente', (data) => {
    const { userGrade } = getAuthDetails();
    if (userGrade !== 'admin') {
      const title = data.status === 'approvata' ? "Approvata! ✅" : "Rifiutata ❌";
      addLiveNote(title, data.message, data.status === 'approvata' ? 'success' : 'error');
    }
  });

  onUnmounted(() => {
    socket.disconnect();
  });
});
</script>

<style scoped>
/* Effetto visivo quando passi il mouse sopra una riga di notifica */
.bg-hover:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

/* Stile per i bordi e l'arrotondamento del menu nero */
.dropdown-menu {
  border-radius: 12px;
  border: 1px solid #4f4f4f !important;
}

/* Animazione fluida di rimbalzo della casetta al passaggio del mouse */
.mailbox-btn {
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.mailbox-btn:hover {
  transform: scale(1.2);
}

/* Link di fondo verde che si sottolinea all'hover */
.link-compile:hover {
  color: #198754 !important;
  text-decoration: underline !important;
}

/* Animazione per far scivolare i nuovi messaggi dall'alto */
.animate-slide-down {
  animation: slideDown 0.2s ease-out;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>