<script setup>
import axios from "axios"
import { onMounted, ref } from "vue"
import replaceByDefault from "@/lib/replaceByDefault"
import { NOT_FOUND_IMAGE } from "@/lib/replaceByDefault"

const food = ref({})
const userGrade = localStorage.getItem('authGrade');
const isLogged = !!userGrade;

const getTopFood = async () => {
  try {
    // Puntiamo alla rotta che abbiamo creato: /foods/top-calorie
    const response = await axios.get("http://localhost:3000/foods/top-calorie")
    const data = response.data

    if (data.img) {
      data.img = `/img/foods/${data.img}`
    } else {
      data.img = NOT_FOUND_IMAGE
    }
    food.value = data
  } catch (e) {
    console.error("Errore nel recupero dell'alimento top:", e)
  }
}

onMounted(getTopFood)
</script>

<template>
  <div class="homeContainer">
    <div class="last shadow-lg">
      <div class="coverImage">
        <img :src="food.img" class="card-img" alt="" @error="replaceByDefault" />
      </div>
      
      <div class="pattern"></div>
      
      <div class="coverText">
        <div>
          <span class="badge bg-success mb-2">Consigliato dal Coach</span>
          <h1>{{ food.nome }}</h1>
          <p>{{ food.note }}</p>
          <div class="d-flex justify-content-center gap-3 mt-2">
            <span>🔥 <strong>{{ food.calorie }}</strong> kcal</span>
            <span>💪 <strong>{{ food.proteine_g }}g</strong> Prot</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="container mb-5">
    <div class="text-center mb-4">
      <h2 class="fw-bold text-white">Cosa vuoi fare?</h2>
      <p class="text-muted">Scegli la tua prossima mossa per dominare i tuoi obiettivi.</p>
    </div>

    <div class="row g-4 justify-content-center">
      
      <div class="col-md-4">
        <a href="#" @click.prevent="$emit('navigate', 'CoachIA')" class="text-decoration-none">
          <div class="card action-card h-100 bg-dark text-white border-secondary shadow-sm rounded-4">
            <div class="card-body d-flex flex-column align-items-center justify-content-center p-4 text-center">
              <span class="display-4 mb-3">🤖</span>
              <h5 class="fw-bold text-success mb-2">Confrontati con un coach IA</h5>
              <p class="text-white-50 small mb-0">Parla con il tuo assistente virtuale per calcolare i macro e inserire i pasti al volo.</p>
            </div>
          </div>
        </a>
      </div>

      <div class="col-md-4">
        <a href="#" @click.prevent="$emit('navigate', 'DailyDiaryPage')" class="text-decoration-none">
          <div class="card action-card h-100 bg-dark text-white border-secondary shadow-sm rounded-4">
            <div class="card-body d-flex flex-column align-items-center justify-content-center p-4 text-center">
              <span class="display-4 mb-3">📓</span>
              <h5 class="fw-bold text-success mb-2">Visualizza il diario giornaliero</h5>
              <p class="text-white-50 small mb-0">Controlla tutto ciò che hai mangiato oggi e monitora i tuoi traguardi calorici.</p>
            </div>
          </div>
        </a>
      </div>

      <div class="col-md-4">
        <a href="#" @click.prevent="$emit('navigate', 'DiarySchema')" class="text-decoration-none">
          <div class="card action-card h-100 bg-dark text-white border-secondary shadow-sm rounded-4">
            <div class="card-body d-flex flex-column align-items-center justify-content-center p-4 text-center">
              <span class="display-4 mb-3">📊</span>
              <h5 class="fw-bold text-success mb-2">Leggi i grafici</h5>
              <p class="text-white-50 small mb-0">Analizza i tuoi progressi nel tempo con statistiche dettagliate sul tuo peso e macro.</p>
            </div>
          </div>
        </a>
      </div>

    </div>
  </div>
</template>

<style scoped>
.homeContainer {
  margin-bottom: 60px; /* Spazio ridotto tra la copertina e i nuovi pulsanti */
}
.last {
  margin: 30px 50px;
  border-radius: 30px;
  box-sizing: border-box;
  overflow: hidden;
  border: 4px solid #198754;
}
.last > * {
  width: 100%;
  height: 500px;
}
.coverImage {
  filter: blur(8px);
  position: relative;
  overflow: hidden;
  margin-bottom: -500px;
}
.coverImage img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.1);
}
.pattern {
  position: relative;
  background-image: url("https://pngimg.com/uploads/dot/dot_PNG4.png");
  background-repeat: repeat;
  background-size: 5px;
  opacity: 0.3;
  margin-bottom: -500px;
}
.coverText {
  justify-content: center;
  align-items: center;
  position: relative;
  display: flex;
  flex-direction: column;
  color: white;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
}
.coverText div {
  background: rgba(0, 0, 0, 0.7);
  border-radius: 20px;
  margin: auto;
  padding: 30px 50px;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.2);
}
.coverText h1 {
  font-size: 3rem;
  font-weight: bold;
  text-transform: uppercase;
}

/* 🌟 STILI PER LE NUOVE CARD AZIONE */
.action-card {
  transition: all 0.3s ease;
  cursor: pointer;
}

/* Effetto Hover: la card si solleva e il bordo diventa verde */
.action-card:hover {
  transform: translateY(-8px);
  border-color: #198754 !important;
  box-shadow: 0 10px 20px rgba(25, 135, 84, 0.2) !important;
  background-color: #212529 !important;
}

.action-card:hover h5 {
  text-shadow: 0 0 10px rgba(25, 135, 84, 0.5);
}
</style>