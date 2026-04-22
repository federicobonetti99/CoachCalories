<script setup>
import axios from "axios"
import { onMounted, ref } from "vue"
import replaceByDefault from "@/lib/replaceByDefault"
import { NOT_FOUND_IMAGE } from "@/lib/replaceByDefault"

const props = defineProps(["id"])
const food = ref({})

const getFood = async (id) => {
  try {
    // Puntiamo alla rotta corretta del tuo backend
    const response = await axios.get("http://localhost:3000/foods/" + id)
    const data = response.data
    
    // Gestione immagine locale
    if (data.img) {
      data.img = `/img/foods/${data.img}`
    } else {
      data.img = NOT_FOUND_IMAGE
    }
    
    food.value = data
  } catch (e) {
    console.error("Errore nel caricamento della MiniCard:", e)
  }
}

onMounted(() => getFood(props.id))
</script>

<template>
  <div class="foodCard shadow-sm">
    <div class="foodCardImg">
      <img alt="food" :src="food.img" @error="replaceByDefault" />
      <div class="kcal-badge">{{ food.calorie }} kcal</div>
    </div>
    <div class="foodCardTxt">
      <h1>{{ food.nome }}</h1>
      <p>{{ food.note }}</p>
      <div class="macros-preview">
        <span>P: {{ food.proteine_g }}g</span>
        <span>C: {{ food.carboidrati_g }}g</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.foodCard {
  width: 30%; /* Mantiene la larghezza che avevi impostato */
  min-width: 300px; /* Evita che diventi troppo stretta */
  box-sizing: border-box;
  height: 180px; /* Un pelo più bassa per essere "mini" */
  display: inline-flex;
  flex-direction: row;
  border: 1px solid #dee2e6;
  border-left: 5px solid #198754; /* Verde Coach */
  border-radius: 12px;
  overflow: hidden;
  background-color: #ffffff;
  transition: transform 0.2s ease-in-out;
}

.foodCard:hover {
  transform: translateY(-5px);
  border-color: #198754;
}

.foodCard h1 {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
  text-transform: capitalize;
  margin-bottom: 5px;
}

.foodCardImg {
  height: 100%;
  width: 40%;
  position: relative;
}

.foodCardImg img {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.kcal-badge {
  position: absolute;
  top: 5px;
  left: 5px;
  background: rgba(25, 135, 84, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
}

.foodCardTxt {
  padding: 12px;
  width: 60%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.foodCardTxt p {
  font-size: 13px;
  color: #6c757d;
  margin: 0;
  display: -webkit-box;
  /* -webkit-line-clamp: 2;  Taglia il testo dopo 2 righe */
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.macros-preview {
  font-size: 11px;
  font-weight: bold;
  color: #198754;
  display: flex;
  gap: 10px;
}
</style>