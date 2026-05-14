<script setup>
import { ref, onMounted } from 'vue'
import Navbar from './components/Navbar.vue'
import LoginContainer from './components/LoginContainer.vue'
import HomeContainer from './components/HomeContainer.vue'
import Catalog from './pages/Catalog.vue' 
import AddFoodPage from './pages/AddFoodPage.vue'
import EditFoodPage from './pages/EditFoodPage.vue'
import DailyDiaryPage from './pages/DailyDiaryPage.vue'
import DiarySchema from './pages/DiarySchemaPage.vue'
import FoodProposalPage from './pages/FoodProposalPage.vue' 
import AdminProposalsPage from './pages/AdminProposalsPage.vue' 

// Importiamo la pagina delle notifiche (usando l'alias NotificationCenterPage per chiarezza)
import NotificationCenterPage from './pages/NotificationCenter.vue'

const isLogged = ref(false)
const userGrade = ref('')
const currentPage = ref('Home')
const selectedFoodId = ref(null) 

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

      <DailyDiaryPage v-if="currentPage === 'DailyDiaryPage'" />

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

      <DiarySchema v-if="currentPage === 'DiarySchema'" />

      <FoodProposalPage v-if="currentPage === 'FoodProposalPage'" />

      <AdminProposalsPage v-if="currentPage === 'AdminProposalsPage'" @navigate="setPage" />

      <NotificationCenterPage v-if="currentPage === 'NotificationCenterPage'" @navigate="setPage" />

    </main>
  </div>
</template>

<style scoped>
/* File pulito, rimosso lo stile bg-black che forzava lo sfondo nero in alto */
</style>