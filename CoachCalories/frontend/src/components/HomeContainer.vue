<script setup>
import axios from "axios"
import { onMounted, ref } from "vue"
import FoodMiniCard from "@/components/FoodMiniCard.vue" // Cambiato nome
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

  <div class="container-fluid d-flex justify-content-center flex-wrap gap-4 mb-5">
    <FoodMiniCard id="METTI_ID_DI_AVOCADO" />
    <FoodMiniCard id="METTI_ID_DI_POLLO" />
    <FoodMiniCard id="METTI_ID_DI_RISO" />
  </div>
</template>

<style scoped>
.homeContainer {
  margin-bottom: 100px; /* Ridotto un po' perché 200px era tantissimo */
}
.last {
  margin: 30px 50px;
  border-radius: 30px;
  box-sizing: border-box;
  overflow: hidden;
  border: 4px solid #198754; /* Un tocco di verde coach */
}
.last > * {
  width: 100%;
  height: 500px;
}
.coverImage {
  filter: blur(8px); /* Aumentato il blur per far leggere meglio il testo */
  position: relative;
  overflow: hidden;
  margin-bottom: -500px;
}
.coverImage img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.1); /* Evita i bordi bianchi col blur */
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
</style>