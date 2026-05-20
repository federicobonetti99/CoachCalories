<script setup>
import { ref, onMounted, nextTick } from 'vue';
import axios from 'axios';

defineProps({
  userGrade: {
    type: String,
    default: ''
  }
});

// Stato per il diario
const todayFoods = ref([]);
const totals = ref({
  calorie: 0,
  carboidrati_g: 0,
  proteine_g: 0,
  grassi_g: 0
});

const username = ref(localStorage.getItem('username'));

// --- STATO E LOGICA DELLA CHAT IA ---
const chatMessages = ref([
  { sender: 'bot', text: `Ehi ${username.value || 'bro'}! Dimmi cos'hai mangiato oggi, ci penso io a fare i conti e metterlo a referto.` }
]);
const userMessage = ref("");
const isTyping = ref(false);
const chatContainer = ref(null);

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const sendMessage = async () => {
  if (!userMessage.value.trim()) return;

  const textToSend = userMessage.value;
  chatMessages.value.push({ sender: 'user', text: textToSend });
  userMessage.value = "";
  isTyping.value = true;
  scrollToBottom();

  try {
    const res = await axios.post("http://localhost:3000/api/chat", {
      message: textToSend,
      username: username.value
    });

    chatMessages.value.push({ sender: 'bot', text: res.data.reply });

    // 🌟 MAGIA: Se il bot ha salvato del cibo, ricarichiamo il diario al volo!
    if (res.data.action === "food_inserted") {
      fetchDiary();
    }
  } catch (e) {
    console.error("Errore chat:", e);
    chatMessages.value.push({ sender: 'bot', text: "Zio, il server è crashato. Ho bisogno di zuccheri, riprova tra poco." });
  } finally {
    isTyping.value = false;
    scrollToBottom();
  }
};
// ------------------------------------

const getTDEE = () => {
  const weight = parseFloat(localStorage.getItem('weight')) || 0;
  const height = parseFloat(localStorage.getItem('height')) || 0;
  const age = parseInt(localStorage.getItem('age')) || 0;
  const gender = localStorage.getItem('gender') || 'M';
  const activityLevel = localStorage.getItem('activityLevel') || 'moderate';

  if (weight === 0 || height === 0 || age === 0) return 2000;

  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr = (gender === 'M') ? bmr + 5 : bmr - 161;

  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
    extra: 1.9
  };

  return Math.round(bmr * (multipliers[activityLevel] || 1.2));
};

const maintenanceCalories = ref(getTDEE());

const getTodayDateString = () => {
  const dateObj = new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const date = ref(getTodayDateString());

const adjustDate = (days) => {
  const currentDate = new Date(date.value);
  currentDate.setDate(currentDate.getDate() + days);
  
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  
  date.value = `${year}-${month}-${day}`;
  fetchDiary();
};

const fetchDiary = async () => {
  try {
    const response = await axios.get(`http://localhost:3000/api/diary?date=${date.value}&username=${username.value}`);
    if (response.data) {
      todayFoods.value = response.data.foods || [];
      totals.value = response.data.totals || { calorie: 0, carboidrati_g: 0, proteine_g: 0, grassi_g: 0 };
    }
  } catch (e) {
    console.error("Errore nel caricamento del diario:", e);
    todayFoods.value = [];
    totals.value = { calorie: 0, carboidrati_g: 0, proteine_g: 0, grassi_g: 0 };
  }
};

const removeFoodFromDiary = async (foodId) => {
  if (!confirm("Sei sicuro di voler rimuovere questo alimento?")) return;
  try {
    const response = await axios.delete(`http://localhost:3000/api/diary/${date.value}/${foodId}?username=${username.value}`);
    todayFoods.value = response.data.foods;
    totals.value = response.data.totals;
  } catch (e) {
    console.error("Errore nella rimozione dell'alimento:", e);
    alert("Impossibile rimuovere l'alimento.");
  }
};

const clearDailyDiary = async () => {
  if (!confirm(`Sei sicuro di voler cancellare TUTTI i cibi del giorno ${date.value}?`)) return;
  try {
    await axios.delete(`http://localhost:3000/api/diary/clear/${date.value}?username=${username.value}`);
    todayFoods.value = [];
    totals.value = { calorie: 0, carboidrati_g: 0, proteine_g: 0, grassi_g: 0 };
  } catch (e) {
    console.error("Errore nello svuotamento del diario:", e);
    alert("Impossibile svuotare il diario.");
  }
};

onMounted(() => {
  fetchDiary();
});
</script>

<template>
  <section class="container-fluid px-4 mt-4 mb-5" style="max-width: 1400px;">
    <div class="row mb-4 align-items-center">
      <div class="col-md-12 text-center">
        <h1 class="display-5 fw-bold text-success">Diario Giornaliero</h1>
        <p class="text-muted">Tieni traccia di tutto ciò che mangi oggi.</p>

        <div class="d-flex justify-content-center align-items-center gap-3 mt-4">
          <button class="btn btn-outline-success px-3" @click="adjustDate(-1)">
            ◀️ Ieri
          </button>
          
          <input 
            type="date" 
            v-model="date" 
            @change="fetchDiary" 
            class="form-control bg-dark text-white border-secondary w-auto text-center" 
          />

          <button class="btn btn-outline-success px-3" @click="adjustDate(1)">
            Domani ▶️
          </button>
        </div>
      </div>
    </div>

    <div class="row g-4 align-items-stretch">
      
      <div class="col-lg-7">
        <div class="card bg-dark text-white shadow-sm border-0 rounded-4 p-4 h-100 d-flex flex-column">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="text-success fw-bold m-0">Resoconto del {{ date }}</h4>
            
            <button 
              v-if="todayFoods.length > 0" 
              class="btn btn-sm btn-outline-danger px-3 fw-bold" 
              @click="clearDailyDiary"
            >
              🗑️ Svuota Giornata
            </button>
          </div>

          <div v-if="todayFoods.length === 0" class="text-center text-white-50 py-5 flex-grow-1 d-flex align-items-center justify-content-center">
            Nessun alimento inserito per oggi. Dillo al coach qui di fianco!
          </div>

          <ul v-else class="list-group list-group-flush mb-4 bg-transparent flex-grow-1 overflow-auto" style="max-height: 400px;">
            <li 
              v-for="food in todayFoods" 
              :key="food._id || food.foodId" 
              class="list-group-item bg-dark text-white d-flex justify-content-between align-items-center border-secondary px-0"
            >
              <div>
                <strong class="text-white">{{ food.nome }}</strong>
              </div>
              <div class="d-flex align-items-center gap-3">
                <span class="badge bg-black border border-secondary text-success" style="font-size: 0.9rem;">{{ food.calorie }} kcal</span>
                <button 
                  class="btn btn-sm btn-outline-danger border-0" 
                  @click="removeFoodFromDiary(food._id || food.foodId)"
                  title="Rimuovi"
                >
                  ❌
                </button>
              </div>
            </li>
          </ul>

          <div class="row g-2 mt-auto bg-black p-3 rounded-3 align-items-center">
            <div class="col-md-3 text-center border-end border-secondary">
              <div class="small text-white text-uppercase fw-bold">Calorie</div>
              <div class="fs-5 fw-bold" :class="totals.calorie > maintenanceCalories ? 'text-danger' : 'text-success'">
                {{ totals.calorie }} / {{ maintenanceCalories }}
              </div>
            </div>
            <div class="col-md-3 text-center border-end border-secondary">
              <div class="small text-white text-uppercase fw-bold">Carbs</div>
              <div class="fs-5 fw-bold text-warning">{{ (totals.carboidrati_g || 0).toFixed(1) }}g</div>
            </div>
            <div class="col-md-3 text-center border-end border-secondary">
              <div class="small text-white text-uppercase fw-bold">Pro</div>
              <div class="fs-5 fw-bold text-danger">{{ (totals.proteine_g || 0).toFixed(1) }}g</div>
            </div>
            <div class="col-md-3 text-center">
              <div class="small text-white text-uppercase fw-bold">Grassi</div>
              <div class="fs-5 fw-bold text-info">{{ (totals.grassi_g || 0).toFixed(1) }}g</div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-5">
        <div class="card bg-dark text-white shadow-sm border-secondary rounded-4 d-flex flex-column h-100" style="min-height: 550px;">
          
          <div class="p-3 border-bottom border-secondary bg-black rounded-top-4 d-flex align-items-center gap-2">
            <span class="fs-4">🤖</span>
            <div>
              <h5 class="m-0 fw-bold text-success">CoachCalories AI</h5>
              <small class="text-white-50">Sempre attivo. Dimmi cosa hai mangiato.</small>
            </div>
          </div>

          <div class="flex-grow-1 p-4 overflow-auto chat-container" ref="chatContainer">
            <div 
              v-for="(msg, i) in chatMessages" 
              :key="i" 
              class="d-flex mb-3 animate-fade-in" 
              :class="msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'"
            >
              <div v-if="msg.sender === 'bot'" class="chat-bubble bot-bubble">
                {{ msg.text }}
              </div>

              <div v-else class="chat-bubble user-bubble">
                {{ msg.text }}
              </div>
            </div>
            
            <div v-if="isTyping" class="d-flex mb-3 justify-content-start animate-fade-in">
              <div class="chat-bubble bot-bubble text-white-50 fst-italic">
                Il coach sta calcolando i macro... 🧠
              </div>
            </div>
          </div>

          <div class="p-3 bg-black border-top border-secondary rounded-bottom-4">
            <div class="input-group">
              <input 
                type="text" 
                v-model="userMessage" 
                @keyup.enter="sendMessage"
                class="form-control bg-dark text-white border-secondary shadow-none" 
                placeholder="Es. Zio, mi sono sfondato..." 
                :disabled="isTyping"
              />
              <button 
                class="btn btn-success fw-bold px-3" 
                @click="sendMessage"
                :disabled="isTyping || !userMessage.trim()"
              >
                Invia 🚀
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  </section>
</template>

<style scoped>
/* Stili per la chat */
.chat-container {
  scroll-behavior: smooth;
  background-color: #1a1d20;
}

/* Modificata la larghezza massima per non sbordare nella colonna più stretta */
.chat-bubble {
  max-width: 85%;
  padding: 12px 18px;
  border-radius: 1.2rem;
  font-size: 1rem;
  line-height: 1.4;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.bot-bubble {
  background-color: #2c3034;
  color: #fff;
  border-bottom-left-radius: 0.2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.user-bubble {
  background-color: #198754;
  color: #fff;
  border-bottom-right-radius: 0.2rem;
  box-shadow: 0 4px 6px rgba(25, 135, 84, 0.2);
}

/* Animazione di comparsa messaggi */
@keyframes fadeInSlideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeInSlideUp 0.3s ease-out forwards;
}

/* Fix per la scrollbar della chat */
.chat-container::-webkit-scrollbar {
  width: 8px;
}
.chat-container::-webkit-scrollbar-track {
  background: transparent;
}
.chat-container::-webkit-scrollbar-thumb {
  background-color: #495057;
  border-radius: 10px;
}
</style>