<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import replaceByDefault from '@/lib/replaceByDefault';

// Dichiarazione della prop passata dal layout per eliminare il warning su userGrade
defineProps({
  userGrade: {
    type: String,
    default: ''
  }
});

// Stato per i cibi e il diario
const foods = ref([]);
const searchQuery = ref("");
const isLogged = ref(true);

const todayFoods = ref([]);
const totals = ref({
  calorie: 0,
  carboidrati_g: 0,
  proteine_g: 0,
  grassi_g: 0
});

// Recuperiamo l'username dell'utente dal Local Storage
const username = ref(localStorage.getItem('username'));

// Funzione per ottenere la data odierna nel formato YYYY-MM-DD
const getTodayDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const date = ref(getTodayDateString());

// Funzione per cambiare data con le frecce
const adjustDate = (days) => {
  const currentDate = new Date(date.value);
  currentDate.setDate(currentDate.getDate() + days);
  
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  
  date.value = `${year}-${month}-${day}`;
  fetchDiary();
};

// Funzione per caricare il catalogo
const listFoods = async () => {
  try {
    const response = await axios.get("http://localhost:3000/foods");
    const data = response.data;
    data.forEach((food) => {
      food.img = food.img ? `/img/foods/${food.img}` : null;
    });
    foods.value = data;
  } catch (e) {
    console.error("Errore nel caricamento del catalogo:", e);
  }
};

// Funzione per caricare il diario dal database
const fetchDiary = async () => {
  try {
    const response = await axios.get(`http://localhost:3000/api/diary?date=${date.value}&username=${username.value}`);
    
    if (response.data) {
      todayFoods.value = response.data.foods || [];
      totals.value = response.data.totals || { calorie: 0, carboidrati_g: 0, proteine_g: 0, grassi_g: 0 };
    }
  } catch (e) {
    console.error("Errore nel caricamento del diario:", e);
    // In caso di errore (es. nessun diario trovato), azzera i totali per il giorno selezionato
    todayFoods.value = [];
    totals.value = { calorie: 0, carboidrati_g: 0, proteine_g: 0, grassi_g: 0 };
  }
};

// Aggiungi un alimento al diario
const addFoodToDiary = async (food) => {
  try {
    const response = await axios.post("http://localhost:3000/api/diary/add", 
      {
        date: date.value,
        food: food,
        username: username.value
      }
    );
    
    todayFoods.value = response.data.foods;
    totals.value = response.data.totals;
  } catch (e) {
    console.error("Errore nell'aggiunta dell'alimento:", e);
    alert("Errore durante l'aggiunta");
  }
};

// Rimuovi un alimento dal diario
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

// Ricerca nel catalogo
const filteredFoods = computed(() => {
  if (!searchQuery.value) return foods.value;
  return foods.value.filter(food => 
    food.nome.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});
onMounted(() => {
  listFoods();
  fetchDiary();
  if (localStorage.getItem("authGrade")) {
    isLogged.value = true;
  }
});
</script>

<template>
  <section class="container mt-4 mb-5">
    <div class="row mb-5 align-items-center">
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

    <div class="card bg-dark text-white shadow-sm border-0 rounded-4 p-4 mb-5">
      <h4 class="text-success fw-bold mb-3">Resoconto della giornata del {{ date }}</h4>

      <div v-if="todayFoods.length === 0" class="text-center text-white-50 py-3">
        Nessun alimento inserito per oggi. Cerca i cibi dal catalogo qui sotto e aggiungili!
      </div>

      <ul v-else class="list-group list-group-flush mb-4 bg-transparent">
        <li 
          v-for="food in todayFoods" 
          :key="food._id || food.foodId" 
          class="list-group-item bg-dark text-white d-flex justify-content-between align-items-center border-secondary"
        >
          <div>
            <strong class="text-success">{{ food.nome }}</strong>
            <span class="ms-2 text-white small">{{ food.quantita }}{{ food.unita }}</span>
          </div>
          <div class="d-flex align-items-center gap-3">
            <span class="badge bg-dark border border-secondary text-white">{{ food.calorie }} kcal</span>
            <button 
              class="btn btn-sm btn-outline-danger" 
              @click="removeFoodFromDiary(food._id || food.foodId)"
              title="Rimuovi"
            >
              ❌
            </button>
          </div>
        </li>
      </ul>

      <div class="row g-2 mt-2 bg-black p-3 rounded-3 align-items-center">
        <div class="col-md-3 text-center border-end border-secondary">
          <div class="small text-white text-uppercase fw-bold">Calorie</div>
          <div class="fs-4 fw-bold text-warning">{{ totals.calorie }} kcal</div>
        </div>
        <div class="col-md-3 text-center border-end border-secondary">
          <div class="small text-white text-uppercase fw-bold">Carbs</div>
          <div class="fs-4 fw-bold text-warning">{{ (totals.carboidrati_g || 0).toFixed(1) }}g</div>
        </div>
        <div class="col-md-3 text-center border-end border-secondary">
          <div class="small text-white text-uppercase fw-bold">Proteine</div>
          <div class="fs-4 fw-bold text-danger">{{ (totals.proteine_g || 0).toFixed(1) }}g</div>
        </div>
        <div class="col-md-3 text-center">
          <div class="small text-white text-uppercase fw-bold">Grassi</div>
          <div class="fs-4 fw-bold text-info">{{ (totals.grassi_g || 0).toFixed(1) }}g</div>
        </div>
      </div>
    </div>

    <div class="bg-dark p-4 rounded-4 shadow-sm mb-4">
      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <h4 class="text-white fw-bold m-0">Seleziona alimenti da aggiungere</h4>
        <input 
          v-model="searchQuery"
          type="text" 
          class="form-control form-control-lg bg-black text-white border-secondary w-50" 
          placeholder="Cerca un alimento (es. Mela, Pollo...)" 
        />
      </div>

      <div class="row">
        <div 
          v-for="food in filteredFoods" 
          :key="food._id" 
          class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4"
        >
          <div class="card h-100 shadow-sm food-card border border-secondary">
            <img 
              v-if="food.img" 
              :src="food.img" 
              class="card-img-top food-img" 
              alt="Alimento" 
              @error="replaceByDefault" 
            />
            
            <div class="card-body bg-dark text-white d-flex flex-column justify-content-between">
              <div>
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <h5 class="card-title fw-bold text-capitalize mb-0">{{ food.nome }}</h5>
                  <span class="badge bg-success">{{ food.calorie }} kcal</span>
                </div>
                
                <p class="card-text small text-white-50 text-truncate">{{ food.note }}</p>

                <div class="macro-container bg-black rounded p-2 mb-3">
                  <div class="row g-0 text-center">
                    <div class="col-4 border-end border-secondary">
                      <div class="small text-white" style="font-size: 0.6rem;">Carbs</div>
                      <div class="fw-bold text-warning" style="font-size: 0.85rem;">{{ food.carboidrati_g }}g</div>
                    </div>
                    <div class="col-4 border-end border-secondary">
                      <div class="small text-white" style="font-size: 0.6rem;">Prot</div>
                      <div class="fw-bold text-danger" style="font-size: 0.85rem;">{{ food.proteine_g }}g</div>
                    </div>
                    <div class="col-4">
                      <div class="small text-white" style="font-size: 0.6rem;">Grassi</div>
                      <div class="fw-bold text-info" style="font-size: 0.85rem;">{{ food.grassi_g }}g</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <small class="text-white d-block mb-2">⚖️ Quantità base: {{ food.quantita }}{{ food.unita }}</small>
                
                <button 
                  class="btn btn-sm btn-success w-100 fw-bold py-2" 
                  @click="addFoodToDiary(food)"
                >
                  ➕ Aggiungi al diario
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.food-card {
  transition: all 0.2s ease;
}

.food-card:hover {
  transform: translateY(-5px);
}

.food-img {
  height: 150px;
  object-fit: cover;
}

.card-title {
  font-size: 1.05rem;
}
</style>