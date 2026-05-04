<script setup>
import { ref, onMounted } from 'vue'
import Navbar from './components/Navbar.vue'
import LoginContainer from './components/LoginContainer.vue'
import HomeContainer from './components/HomeContainer.vue'
import Catalog from './pages/Catalog.vue' 
import AddFoodPage from './pages/AddFoodPage.vue'
import EditFoodPage from './pages/EditFoodPage.vue' // Aggiunto import

const isLogged = ref(false)
const userGrade = ref('')
const currentPage = ref('Home')
const selectedFoodId = ref(null) // Variabile per l'ID

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

// Funzione aggiornata per accettare anche l'ID
const setPage = (pageName, id = null) => {
  currentPage.value = pageName
  if (id) {
    selectedFoodId.value = id
  }
}
</script>

<template>
  <div id="app">
    <Navbar :userGrade="userGrade" @logout="handleLogout" @navigate="setPage" />

    <main class="container mt-4">
      
      <LoginContainer 
        v-if="currentPage === 'Home' && !isLogged" 
        @login-success="handleLoginSuccess" 
      />
      
      <HomeContainer 
        v-if="currentPage === 'Home' && isLogged" 
        :userGrade="userGrade" 
      />

      <div v-if="currentPage === 'Catalog'" class="catalog-section">
        <h2 class="text-white mb-4">Gestione Catalogo Alimentare</h2>
        <Catalog @navigate="setPage" /> 
      </div>

      <AddFoodPage v-if="currentPage === 'AddFoodPage'" />

      <EditFoodPage 
        v-if="currentPage === 'EditFoodPage'" 
        :food-id="selectedFoodId" 
        @navigate="setPage"
      />

    </main>
  </div>
</template>

<style scoped>
/* Aggiungi qui eventuali stili specifici */
</style>