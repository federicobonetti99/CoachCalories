<script setup>
import FoodCard from "@/components/FoodCard.vue";
import { NOT_FOUND_IMAGE } from "@/lib/replaceByDefault";
import axios from "axios";
import { onMounted, ref, computed } from "vue";

const foods = ref([]);
const searchQuery = ref("");
// 1. Aggiungiamo lo stato di login
const isLogged = ref(false);

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

const filteredFoods = computed(() => {
  if (!searchQuery.value) return foods.value;
  return foods.value.filter(food => 
    food.nome.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

onMounted(() => {
  listFoods();
  // Controlliamo la chiave corretta che creiamo al momento del login
  if (localStorage.getItem("authGrade")) {
    isLogged.value = true;
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
        />
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