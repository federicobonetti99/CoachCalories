<script setup>
import { ref } from 'vue'
import HomeContainer from "@/components/HomeContainer.vue"
import LoginContainer from "@/components/LoginContainer.vue"


const isLogged = ref(false)
const handleLoginSuccess = () => {
  isLogged.value = true
}
</script>

<template>
  <LoginContainer v-if="!isLogged" @login-success="handleLoginSuccess" /> 

  <HomeContainer v-else />
</template>
