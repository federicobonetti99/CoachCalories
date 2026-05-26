<script setup>
import { ref, computed, onMounted } from 'vue';

// Inizializziamo a null o stringhe vuote: NIENTE dati di default fittizi
const weight = ref(null);
const height = ref(null);
const age = ref(null);
const gender = ref('');
const activityLevel = ref('');

// Stati per i feedback all'utente
const showSuccess = ref(false);
const showError = ref(false);
const errorMessage = ref('');

// Controllo dei dati al caricamento della pagina
onMounted(() => {
  const storedWeight = localStorage.getItem('weight');
  const storedHeight = localStorage.getItem('height');
  const storedAge = localStorage.getItem('age');
  const storedGender = localStorage.getItem('gender');
  const storedActivity = localStorage.getItem('activityLevel');

  // Se manca anche uno solo dei dati fondamentali, scatta l'errore
  if (!storedWeight || !storedHeight || !storedAge || !storedGender || !storedActivity) {
    showError.value = true;
    errorMessage.value = "⚠️ Errore: Dati fisiologici non trovati! Imposta i tuoi parametri per calcolare il metabolismo.";
    
    // Lasciamo i campi pronti per essere compilati da zero
    gender.value = 'M'; 
    activityLevel.value = 'moderate';
  } else {
    // Se ci sono, li carichiamo normalmente
    weight.value = parseFloat(storedWeight);
    height.value = parseFloat(storedHeight);
    age.value = parseInt(storedAge);
    gender.value = storedGender;
    activityLevel.value = storedActivity;
  }
});

// Calcolo dinamico del BMR (solo se i dati sono presenti, altrimenti restituisce null)
const bmr = computed(() => {
  if (!weight.value || !height.value || !age.value) return null;
  let base = (10 * weight.value) + (6.25 * height.value) - (5 * age.value);
  return gender.value === 'M' ? Math.round(base + 5) : Math.round(base - 161);
});

// Calcolo dinamico del TDEE (solo se il BMR è valido)
const tdee = computed(() => {
  if (!bmr.value) return null;
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
    extra: 1.9
  };
  return Math.round(bmr.value * (multipliers[activityLevel.value] || 1.2));
});

// Salvataggio dei dati nel localStorage
const saveData = () => {
  if (!weight.value || !height.value || !age.value) {
    showError.value = true;
    errorMessage.value = "⚠️ Compila tutti i campi prima di salvare!";
    return;
  }

  localStorage.setItem('weight', weight.value);
  localStorage.setItem('height', height.value);
  localStorage.setItem('age', age.value);
  localStorage.setItem('gender', gender.value);
  localStorage.setItem('activityLevel', activityLevel.value);
  
  // Resettiamo l'errore se presente e mostriamo il successo
  showError.value = false;
  showSuccess.value = true;
  setTimeout(() => { showSuccess.value = false; }, 3000);
};
</script>

<template>
  <section class="container mb-5">
    <div class="text-center mb-4">
      <h2 class="fw-bold text-white">Dati Fisiologici</h2>
      <p class="text-muted">Gestisci i tuoi parametri antropometrici.</p>
    </div>

    <div v-if="showError" class="alert alert-danger text-center shadow-sm rounded-3 mb-4 mx-auto" style="max-width: 800px;">
      {{ errorMessage }}
    </div>

    <div class="row g-4 justify-content-center">
      <div class="col-lg-6">
        <div class="card bg-dark text-white border-secondary shadow-sm rounded-4 h-100">
          <div class="card-body p-4">
            <h4 class="text-success mb-4 border-bottom border-secondary pb-2">I tuoi parametri</h4>
            
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label text-white-50">Peso (kg)</label>
                <input type="number" v-model="weight" autocomplete="off" class="form-control bg-black text-white border-secondary" min="30" max="250" placeholder="es. 75">
              </div>
              <div class="col-md-6">
                <label class="form-label text-white-50">Altezza (cm)</label>
                <input type="number" v-model="height" autocomplete="off" class="form-control bg-black text-white border-secondary" min="100" max="250" placeholder="es. 175">
              </div>
              
              <div class="col-md-6">
                <label class="form-label text-white-50">Età</label>
                <input type="number" v-model="age" autocomplete="off" class="form-control bg-black text-white border-secondary" min="14" max="100" placeholder="es. 25">
              </div>
              <div class="col-md-6">
                <label class="form-label text-white-50">Sesso</label>
                <select v-model="gender" autocomplete="off" class="form-select bg-black text-white border-secondary">
                  <option value="M">Uomo</option>
                  <option value="F">Donna</option>
                </select>
              </div>

              <div class="col-12">
                <label class="form-label text-white-50">Livello di Attività Fisica</label>
                <select v-model="activityLevel" autocomplete="off" class="form-select bg-black text-white border-secondary">
                  <option value="sedentary">Sedentario (Poco o nessun esercizio)</option>
                  <option value="light">Leggero (Esercizio 1-3 volte a settimana)</option>
                  <option value="moderate">Moderato (Esercizio 3-5 volte a settimana)</option>
                  <option value="very">Molto Attivo (Esercizio 6-7 volte a settimana)</option>
                  <option value="extra">Estremo (Lavoro fisico pesante o doppi allenamenti)</option>
                </select>
              </div>
            </div>

            <button @click="saveData" class="btn btn-success w-100 mt-4 fw-bold">
              💾 Salva Dati
            </button>

            <div v-if="showSuccess" class="alert alert-success mt-3 py-2 text-center fade-in">
              Dati salvati e ricalcolati con successo!
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-5">
        <div class="card bg-dark text-white border-secondary shadow-sm rounded-4 h-100">
          <div class="card-body p-4 d-flex flex-column justify-content-center">
            <h4 class="text-info mb-4 text-center border-bottom border-secondary pb-2">Analisi Metabolica</h4>
            
            <div class="text-center mb-4">
              <span class="d-block text-white-50 mb-1">Metabolismo Basale (BMR)</span>
              <h2 class="display-6 fw-bold text-white m-0">
                {{ bmr !== null ? bmr : '--' }} <small class="fs-5 text-muted">kcal</small>
              </h2>
              <small class="text-muted">Energia per le funzioni vitali a riposo</small>
            </div>

            <div class="text-center p-3 bg-black rounded-3 border" :class="tdee !== null ? 'border-success' : 'border-secondary'">
              <span class="d-block fw-bold text-uppercase mb-1" :class="tdee !== null ? 'text-success' : 'text-muted'">
                Dispendio Energetico (TDEE)
              </span>
              <h1 class="display-4 fw-bold m-0" :class="tdee !== null ? 'text-success' : 'text-white-50'">
                {{ tdee !== null ? tdee : '--' }} <small class="fs-4 text-white-50">kcal</small>
              </h1>
              <p class="small text-muted mt-2 mb-0">
                {{ tdee !== null ? 'Questo è il tuo target di mantenimento attuale.' : 'Inserisci e salva i tuoi dati per sbloccare il calcolo del TDEE.' }}
              </p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
input[type="number"]::-webkit-inner-spin-button, 
input[type="number"]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}
</style>