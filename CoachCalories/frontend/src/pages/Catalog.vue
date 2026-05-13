<script setup>
import FoodCard from "@/components/FoodCard.vue";
import { NOT_FOUND_IMAGE } from "@/lib/replaceByDefault";
import axios from "axios";
import { onMounted, ref, computed } from "vue";

const foods = ref([]);
const searchQuery = ref("");

// Stato di login e permessi inizializzati vuoti per sicurezza
const isLogged = ref(false);
const userGrade = ref("");

const listFoods = async () => {
  try {
    const response = await axios.get("http://localhost:3000/foods");
    const data = response.data;

    data.forEach((food) => {
      food.img = food.img ? `/img/foods/${food.img}` : NOT_FOUND_IMAGE;
    });

    foods.value = data;
  } catch (e) {
    console.error("Errore nel caricamento dei cibi:", e);
  }
};

// --- MODIFICATO: Controllo di approvazione e ricerca combinati ---
const filteredFoods = computed(() => {
  // 1. Filtriamo prima per stato di approvazione (mostra solo se approvato !== false)
  const cibiVisibili = foods.value.filter(food => food.approvato !== false);

  // 2. Se non c'è testo nella barra di ricerca, restituiamo tutti i cibi visibili
  if (!searchQuery.value) return cibiVisibili;

  // 3. Altrimenti applichiamo il filtro testuale sui soli cibi visibili (CORRETTO)
  return cibiVisibili.filter(food => 
    food.nome.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

onMounted(() => {
  listFoods();
  
  // --- FEATURE CONTROLLATA: Il token è l'unica fonte di verità ---
  const token = localStorage.getItem("token");
  const savedGrade = localStorage.getItem("authGrade");

  if (token && savedGrade) {
    // Sei loggato DAVVERO solo se c'è il token attivo nella sessione attuale
    isLogged.value = true;
    userGrade.value = savedGrade;
  } else {
    // Altrimenti (Chrome chiuso o logout), facciamo tabula rasa istantanea dei residui
    isLogged.value = false;
    userGrade.value = "";
    localStorage.removeItem("authGrade"); 
    localStorage.removeItem("username"); // Rimuoviamo anche l'utente per pulizia totale
  }
});
</script>

<template>
  <section class="container mt-4">
    <div class="row mb-5 align-items-center">
      <div class="col-md-6">
        <h1 class="display-5 fw-bold text-success">Calorie Coach</h1>
        <p class="text-muted">Gestisci la tua alimentazione con precisione.</p>
      </div>
      <div class="col-md-6">
        <input 
          v-model="searchQuery"
          type="text" 
          class="form-control form-control-lg shadow-sm" 
          placeholder="Cerca un alimento (es. Pollo, Avocado...)"
        />
      </div>
    </div>

    <div class="row">
      <div 
        v-for="food in filteredFoods" 
        :key="food._id" 
        class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4"
      >
        <FoodCard 
          :food="food" 
          :isLogged="isLogged" 
          @food-deleted="listFoods" 
          @navigate="(page, id) => $emit('navigate', page, id)" />
      </div>

      <div 
        v-if="userGrade === 'admin'" 
        class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4" 
        @click="$emit('navigate', 'AddFoodPage')"
      >
        <div 
          class="card h-100 shadow-sm food-card" 
          style="cursor: pointer; border-left: 6px solid #198754;"
        >
          <div class="row g-0 align-items-center h-100">
            <div class="col-md-5 col-lg-4 bg-success bg-opacity-10 d-flex justify-content-center align-items-center" style="min-height: 200px;">
              <i class="bi bi-plus-circle text-success" style="font-size: 3.5rem;"></i>
            </div>
            
            <div class="col-md-7 col-lg-8">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <h5 class="card-title fw-bold m-0 text-success text-capitalize">Nuovo Alimento</h5>
                  <span class="badge rounded-pill bg-success">Admin</span>
                </div>

                <p class="card-text small text-muted mb-3">Clicca per inserire un nuovo elemento nel database.</p>

                <div class="macro-container bg-light rounded p-2 text-center border">
                  <small class="text-secondary fw-bold">Pannello di Controllo</small>
                </div>
                
                <div class="mt-3">
                  <div class="d-flex justify-content-end">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="filteredFoods.length === 0" class="text-center py-5">
      <div v-if="foods.length === 0">
        <div class="spinner-border text-success mb-3" role="status"></div>
        <p class="h5 text-muted">Caricamento database in corso o database vuoto...</p>
      </div>
      <div v-else>
        <p class="h5 text-muted">Nessun alimento corrisponde a "{{ searchQuery }}"</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.container {
  max-width: 1200px;
}

.form-control:focus {
  border-color: #198754;
  box-shadow: 0 0 0 0.25rem rgba(25, 135, 84, 0.25);
}

.row {
  transition: all 0.3s ease;
}
</style>