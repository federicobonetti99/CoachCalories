<script setup>
import NavButton from "@/components/NavButton.vue";
// 🌟 IMPORTIAMO IL NUOVO COMPONENTE DROPDOWN PER LE NOTIFICHE
import NotificationDropdown from "./NotificationDropdown.vue";

const props = defineProps(['userGrade']);
const emit = defineEmits(['logout', 'navigate']);
</script>

<template>
  <nav class="navbar navbar-light bg-light navbar-expand-lg shadow-sm">
    <div class="container-fluid container">
      
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navContent">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          
          <li class="nav-item">
            <a class="nav-link" href="#" @click.prevent="$emit('navigate', 'Home')">Home</a>
          </li> 

          <li v-if="userGrade" class="nav-item">
            <a class="nav-link" href="#" @click.prevent="$emit('navigate', 'DailyDiaryPage')">Diario Giornaliero</a>
          </li>

          <li v-if="userGrade" class="nav-item">
            <a class="nav-link text-info fw-bold" href="#" @click.prevent="$emit('navigate', 'DiarySchema')">📊 Analisi</a>
          </li>

          <li class="nav-item">
            <a class="nav-link" href="#" @click.prevent="$emit('navigate', 'Catalog')">Catalog</a>
          </li>

          <li v-if="userGrade && userGrade !== 'admin'" class="nav-item">
            <a class="nav-link text-success fw-bold" href="#" @click.prevent="$emit('navigate', 'FoodProposalPage')">💡 Suggerisci Cibo</a>
          </li>

          <li v-if="userGrade === 'admin'" class="nav-item">
            <a class="nav-link" href="#" @click.prevent="$emit('navigate', 'AddFoodPage')">Aggiungi Alimento</a>
          </li>

          <li v-if="userGrade === 'admin'" class="nav-item">
            <a class="nav-link text-warning fw-bold" href="#" @click.prevent="$emit('navigate', 'AdminProposalsPage')">📥 Gestisci Proposte</a>
          </li>

        </ul>
      </div>

      <div class="d-flex align-items-center ms-auto">
        
        <div v-if="userGrade" class="me-3">
          <NotificationDropdown @view-all="$emit('navigate', 'NotificationCenterPage')" />
        </div>

        <span class="me-3 small fw-bold text-muted text-uppercase d-none d-sm-inline">
          {{ userGrade || 'Ospite' }}
        </span>
        
        <button v-if="userGrade" @click="$emit('logout')" class="btn btn-outline-danger btn-sm">
          Esci
        </button>
      </div>

    </div>
  </nav>
</template>

<style scoped>
.nav-link {
  transition: color 0.2s ease-in-out;
}
.nav-link:hover {
  color: #198754 !important;
}
</style>