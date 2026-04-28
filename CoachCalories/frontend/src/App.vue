<script setup>
import { ref, onMounted } from 'vue'
import Navbar from './components/Navbar.vue'
import LoginContainer from './components/LoginContainer.vue'
import HomeContainer from './components/HomeContainer.vue'
import Catalog from './pages/Catalog.vue' 

const isLogged = ref(false)
const userGrade = ref('')
const currentPage = ref('Home')

onMounted(() => {
  const savedEmail = localStorage.getItem('userEmail')
  const savedGrade = localStorage.getItem('authGrade')
  if (savedEmail) {
    isLogged.value = true
    userGrade.value = savedGrade
  }
})

const handleLoginSuccess = () => {
  isLogged.value = true
  userGrade.value = localStorage.getItem('authGrade')
  currentPage.value = 'Home'
}

const handleLogout = () => {
  localStorage.clear()
  isLogged.value = false
  userGrade.value = ''
  currentPage.value = 'Home'
}

// Funzione che riceve il nome della pagina dalla Navbar
const setPage = (pageName) => {
  currentPage.value = pageName
}
</script>

<template>
  <div id="app">
    <Navbar :userGrade="userGrade" @logout="handleLogout" @navigate="setPage" />

    <main class="container mt-4">
      <LoginContainer v-if="!isLogged && currentPage === 'Home'" @login-success="handleLoginSuccess" />

      <HomeContainer v-if="isLogged && currentPage === 'Home'" :userGrade="userGrade" />

      <div v-if="currentPage === 'Catalog'" class="catalog-section">
        <h2 class="text-white mb-4">Gestione Catalogo Alimentare</h2>
        <Catalog /> 
      </div>
    </main>
  </div>
</template>