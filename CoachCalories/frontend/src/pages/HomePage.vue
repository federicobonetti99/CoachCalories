<script setup>
import { ref } from 'vue' // Rimosso onMounted perché non serve più qui
import HomeContainer from "@/components/HomeContainer.vue"
import LoginContainer from "@/components/LoginContainer.vue"

// CONTROLLO ISTANTANEO: Leggiamo il token PRIMA che Vue disegni il template.
// Se il token c'è, isLogged parte subito come 'true', evitando che il LoginContainer si svegli.
const token = localStorage.getItem("token");
const isLogged = ref(!!token);

const handleLoginSuccess = () => {
  isLogged.value = true
}
</script>

<template>
  <LoginContainer v-if="!isLogged" @login-success="handleLoginSuccess" /> 
  <HomeContainer v-else />
</template>