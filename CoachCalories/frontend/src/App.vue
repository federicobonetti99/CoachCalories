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
import NotificationCenterPage from './pages/NotificationCenter.vue'
import CoachIA from './pages/CoachIA.vue'
import PhysiologicalDataPage from './pages/PhysiologicalDataPage.vue'

const isLogged = ref(false)
const userGrade = ref('')
const currentPage = ref('Home')
const selectedFoodId = ref(null) 

// 🌟 BLINDA IL CARICAMENTO: Leggiamo SUBITO la sessione prima ancora che i componenti facciano il mount graficamente
const savedEmail = localStorage.getItem('userEmail')
const savedGrade = localStorage.getItem('authGrade')
if (savedEmail) {
  isLogged.value = true
  userGrade.value = savedGrade
  
  // Se l'utente era rimasto bloccato in una pagina specifica prima del refresh, la recuperiamo
  const savedPage = localStorage.getItem('currentPage')
  if (savedPage) {
    currentPage.value = savedPage
  }
}

// Chiudiamo eventuali falle residue al mount
onMounted(() => {
  const checkEmail = localStorage.getItem('userEmail')
  const checkGrade = localStorage.getItem('authGrade')
  if (!checkEmail && isLogged.value) {
    handleLogout()
  } else if (checkEmail && !isLogged.value) {
    isLogged.value = true
    userGrade.value = checkGrade
  }
})

// 🌟 LOGIN TRANQUILLO: Evitiamo letture asincrone sul localStorage che possono arrivare in ritardo
const handleLoginSuccess = () => {
  const currentGrade = localStorage.getItem('authGrade') || 'user'
  userGrade.value = currentGrade
  isLogged.value = true
  currentPage.value = 'Home'
  localStorage.setItem('currentPage', 'Home')
}

const handleLogout = () => {
  localStorage.clear()
  isLogged.value = false
  userGrade.value = ''
  currentPage.value = 'Home'
}

// 🌟 NAVIGAZIONE SICURA: Ogni volta che l'utente cambia pagina, salviamo lo stato per i refresh accidentali
const setPage = (pageName, id = null) => {
  // Controlliamo che un utente non loggato non provi a saltare il login andando su pagine protette
  if (!isLogged.value && pageName !== 'Home' && pageName !== 'Catalog') {
    currentPage.value = 'Home'
    localStorage.setItem('currentPage', 'Home')
    return
  }

  currentPage.value = pageName
  localStorage.setItem('currentPage', pageName)
  
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
        @navigate="setPage"
      />

      <DailyDiaryPage v-if="currentPage === 'DailyDiaryPage' && isLogged" />

      <CoachIA v-if="currentPage === 'CoachIA' && isLogged" />

      <div v-if="currentPage === 'Catalog'" class="catalog-section">
        <h2 class="text-white mb-4">Gestione Catalogo Alimentare</h2>
        <Catalog @navigate="setPage" /> 
      </div>

      <AddFoodPage v-if="currentPage === 'AddFoodPage' && userGrade === 'admin'" />

      <EditFoodPage 
        v-if="currentPage === 'EditFoodPage' && userGrade === 'admin'" 
        :food-id="selectedFoodId" 
        @navigate="setPage"
      />

      <DiarySchema v-if="currentPage === 'DiarySchema' && isLogged" />

      <FoodProposalPage v-if="currentPage === 'FoodProposalPage' && isLogged && userGrade !== 'admin'" />

      <AdminProposalsPage v-if="currentPage === 'AdminProposalsPage' && userGrade === 'admin'" @navigate="setPage" />

      <NotificationCenterPage v-if="currentPage === 'NotificationCenterPage' && isLogged" @navigate="setPage" />

      <PhysiologicalDataPage v-if="currentPage === 'PhysiologicalDataPage' && isLogged" />

    </main>
  </div>
</template>

<style scoped>
/* Resettati tutti gli stili forzati vecchi che rompevano la navigazione */
#app {
  min-height: 100vh;
}
</style>