<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

// Stato base
const weight = ref(null);
const height = ref(null);
const age = ref(null);
const gender = ref('');
const activityLevel = ref('');
const lastUpdated = ref('');

// Stato per lo storico
const historyRecords = ref([]);

// Feedback
const showSuccess = ref(false);
const showError = ref(false);
const errorMessage = ref('');

// Formattazione data per la tabella
const formatDate = (dateString) => {
  if (!dateString) return 'Attuale';
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// Recupero dello storico dal DB
const fetchHistory = async () => {
  const userEmail = localStorage.getItem('userEmail');
  if (!userEmail) return;

  try {
    const response = await axios.get(`http://localhost:3000/api/auth/history/${userEmail}`);
    if (response.data.success) {
      historyRecords.value = response.data.history;
    }
  } catch (error) {
    console.error("Impossibile caricare lo storico", error);
  }
};

// 🌟 NUOVA FUNZIONE: Eliminazione di un record archiviato
const deleteRecord = async (recordId) => {
  // Chiediamo conferma all'utente prima di procedere
  if (!confirm("Sei sicuro di voler eliminare definitivamente questo record dallo storico?")) {
    return;
  }

  const userEmail = localStorage.getItem('userEmail');
  try {
    const response = await axios.post('http://localhost:3000/api/auth/delete-physiological', {
      email: userEmail,
      recordId: recordId
    });

    if (response.data.success) {
      // Rinfreschiamo subito la tabella a schermo
      fetchHistory();
    }
  } catch (error) {
    console.error(error);
    showError.value = true;
    errorMessage.value = error.response?.data?.message || "⚠️ Errore durante l'eliminazione del record.";
    setTimeout(() => { showError.value = false; }, 4000);
  }
};

onMounted(() => {
  const storedWeight = localStorage.getItem('weight');
  const storedHeight = localStorage.getItem('height');
  const storedAge = localStorage.getItem('age');
  const storedGender = localStorage.getItem('gender');
  const storedActivity = localStorage.getItem('activityLevel');
  const storedDate = localStorage.getItem('lastUpdated');

  if (!storedWeight || !storedHeight || !storedAge || !storedGender || !storedActivity) {
    showError.value = true;
    errorMessage.value = "⚠️ Errore: Dati fisiologici non trovati! Imposta i tuoi parametri.";
    gender.value = 'M'; 
    activityLevel.value = 'moderate';
  } else {
    weight.value = parseFloat(storedWeight);
    height.value = parseFloat(storedHeight);
    age.value = parseInt(storedAge);
    gender.value = storedGender;
    activityLevel.value = storedActivity;
    lastUpdated.value = storedDate || '';
  }

  fetchHistory();
});

const bmr = computed(() => {
  if (!weight.value || !height.value || !age.value) return null;
  let base = (10 * weight.value) + (6.25 * height.value) - (5 * age.value);
  return gender.value === 'M' ? Math.round(base + 5) : Math.round(base - 161);
});

const tdee = computed(() => {
  if (!bmr.value) return null;
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725, extra: 1.9 };
  return Math.round(bmr.value * (multipliers[activityLevel.value] || 1.2));
});

const saveData = async () => {
  if (!weight.value || !height.value || !age.value) {
    showError.value = true;
    errorMessage.value = "⚠️ Compila tutti i campi prima di salvare!";
    return;
  }

  const userEmail = localStorage.getItem('userEmail');
  if (!userEmail) {
    showError.value = true;
    errorMessage.value = "⚠️ Errore di sessione. Fai nuovamente il login.";
    return;
  }

  try {
    const response = await axios.post('http://localhost:3000/api/auth/update-physiological', {
      email: userEmail,
      weight: weight.value,
      height: height.value,
      age: age.value,
      gender: gender.value,
      activityLevel: activityLevel.value
    });

    if (response.data.success) {
      const now = new Date().toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      localStorage.setItem('weight', weight.value);
      localStorage.setItem('height', height.value);
      localStorage.setItem('age', age.value);
      localStorage.setItem('gender', gender.value);
      localStorage.setItem('activityLevel', activityLevel.value);
      localStorage.setItem('lastUpdated', now); 
      
      lastUpdated.value = now;
      showError.value = false;
      showSuccess.value = true;
      
      fetchHistory();

      setTimeout(() => { showSuccess.value = false; }, 3000);
    }
  } catch (error) {
    console.error(error);
    showError.value = true;
    errorMessage.value = "⚠️ Errore di comunicazione col server. Impossibile salvare i dati.";
  }
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
                <label class="form-label text-white-50">Livello di Attività</label>
                <select v-model="activityLevel" autocomplete="off" class="form-select bg-black text-white border-secondary">
                  <option value="sedentary">Sedentario</option>
                  <option value="light">Leggero</option>
                  <option value="moderate">Moderato</option>
                  <option value="very">Molto Attivo</option>
                  <option value="extra">Estremo</option>
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
              <small class="text-muted">Energia a riposo</small>
            </div>

            <div class="text-center p-3 bg-black rounded-3 border" :class="tdee !== null ? 'border-success' : 'border-secondary'">
              <span class="d-block fw-bold text-uppercase mb-1" :class="tdee !== null ? 'text-success' : 'text-muted'">
                Dispendio Energetico (TDEE)
              </span>
              <h1 class="display-4 fw-bold m-0" :class="tdee !== null ? 'text-success' : 'text-white-50'">
                {{ tdee !== null ? tdee : '--' }} <small class="fs-4 text-white-50">kcal</small>
              </h1>
              <p class="small text-muted mt-2 mb-0">
                Target di mantenimento attuale.
              </p>
            </div>
            
          </div>
        </div>
      </div>
    </div>

    <div class="row mt-5 justify-content-center" v-if="historyRecords.length > 0">
      <div class="col-lg-11">
        <h4 class="text-white mb-3"><i class="bi bi-clock-history me-2"></i>Storico Variazioni</h4>
        <div class="table-responsive rounded-3 border border-secondary shadow-sm">
          <table class="table table-dark table-hover mb-0 align-middle">
            <thead class="table-active text-white-50">
              <tr>
                <th scope="col">Data Inizio</th>
                <th scope="col">Data Fine</th>
                <th scope="col">Peso</th>
                <th scope="col">Altezza</th>
                <th scope="col">Età</th>
                <th scope="col">Stato / Azioni</th> </tr>
            </thead>
            <tbody>
              <tr v-for="(record, index) in historyRecords" :key="index">
                <td>{{ formatDate(record.startDate) }}</td>
                <td :class="{'text-white-50': record.endDate}">{{ formatDate(record.endDate) }}</td>
                <td class="fw-bold">{{ record.weight }} kg</td>
                <td>{{ record.height }} cm</td>
                <td>{{ record.age }} anni</td>
                <td>
                  <span v-if="!record.endDate" class="badge bg-success">Attivo</span>
                  
                  <button v-else @click="deleteRecord(record._id)" class="btn btn-outline-danger btn-sm border-0 py-1 px-2" title="Elimina dallo storico">
                    🗑️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
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