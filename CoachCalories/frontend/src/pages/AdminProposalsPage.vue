<template>
  <div class="container mt-5 mb-5">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="display-6 fw-bold text-success">Approvazione Proposte</h1>
        <p class="text-white-50">Gestisci e approva gli alimenti suggeriti dagli utenti.</p>
      </div>
      <button class="btn btn-outline-secondary btn-sm" @click="$emit('navigate', 'Catalog')">
        ⬅ Torna al Catalogo
      </button>
    </div>

    <div v-if="messaggio" class="alert alert-success text-center fw-bold shadow-sm mb-4">
      ✅ {{ messaggio }}
    </div>
    <div v-if="errore" class="alert alert-danger text-center fw-bold shadow-sm mb-4">
      ❌ {{ errore }}
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-success" role="status"></div>
      <p class="text-white-50 mt-2">Caricamento delle proposte in corso...</p>
    </div>

    <div v-else-if="proposals.length === 0" class="text-center py-5 bg-dark rounded-4 shadow-lg border border-secondary border-opacity-50">
      <i class="bi bi-inbox text-success mb-3 d-block" style="font-size: 3.5rem;"></i>
      <h3 class="h4 text-white fw-bold mb-2">Tutto pulito!</h3>
      <p class="text-light-50 m-0">Non ci sono proposte da esaminare al momento.</p>
    </div>

    <div v-else class="row">
      <div v-for="item in proposals" :key="item._id" class="col-md-6 col-lg-4 mb-4">
        <div class="card bg-dark text-white shadow-lg border-0 rounded-4 h-100 d-flex flex-column justify-content-between">
          
          <div>
            <div class="position-relative">
              <img 
                :src="item.img" 
                class="card-img-top rounded-t-4 object-cover" 
                alt="Foto alimento"
                style="height: 180px; object-fit: cover;"
              >
              <span class="badge bg-warning text-dark position-absolute top-0 end-0 m-3 fw-bold shadow">
                In Attesa
              </span>
            </div>

            <div class="card-body p-4">
              <h4 class="card-title fw-bold text-success text-capitalize mb-1">{{ item.nome }}</h4>
              <p class="text-white-50 small mb-3">Porzione base: <strong>{{ item.quantita }}{{ item.unita }}</strong></p>

              <div class="row g-2 text-center bg-black bg-opacity-40 p-2 rounded-3 mb-2">
                <div class="col-3">
                  <div class="text-warning small fw-bold">Kcal</div>
                  <div class="fs-5 fw-bold">{{ item.calorie }}</div>
                </div>
                <div class="col-3">
                  <div class="text-success small fw-bold">Prot</div>
                  <div class="fs-5 fw-bold">{{ item.proteine_g }}g</div>
                </div>
                <div class="col-3">
                  <div class="text-danger small fw-bold">Gras</div>
                  <div class="fs-5 fw-bold">{{ item.grassi_g }}g</div>
                </div>
                <div class="col-3">
                  <div class="text-primary small fw-bold">Carb</div>
                  <div class="fs-5 fw-bold">{{ item.carboidrati_g }}g</div>
                </div>
              </div>
            </div>
          </div>

          <div class="card-footer bg-black bg-opacity-20 border-0 p-4 pt-0 row gx-2 mx-0">
            <div class="col-6">
              <button class="btn btn-danger w-100 fw-bold" @click="rifiutaProposta(item._id)">
                🗑 RIFIUTA
              </button>
            </div>
            <div class="col-6">
              <button class="btn btn-success w-100 fw-bold" @click="approvaProposta(item._id)">
                🚀 APPROVA
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { NOT_FOUND_IMAGE } from "@/lib/replaceByDefault";

const proposals = ref([]);
const loading = ref(true);
const messaggio = ref('');
const errore = ref('');

const fetchProposals = async () => {
  loading.value = true;
  errore.value = '';
  try {
    const response = await axios.get("http://localhost:3000/foods/admin/proposals-list");
    const soloProposte = response.data;

    soloProposte.forEach((food) => {
      // 🌟 MODIFICA QUESTA RIGA: Togliamo "http://localhost:3000" 
      // Usiamo il percorso relativo partendo dalla cartella 'public' o dagli asset statici del tuo frontend
      food.img = food.img ? `/img/foods/${food.img}` : NOT_FOUND_IMAGE;
    });

    proposals.value = soloProposte;
  } catch (err) {
    console.error("Errore recupero proposte:", err);
    errore.value = "Impossibile caricare le proposte dall'app.";
  } finally {
    loading.value = false;
  }
};

const approvaProposta = async (id) => {
  messaggio.value = '';
  errore.value = '';
  try {
    // 🌟 Puntiamo alla nuova rotta dedicata usando .patch
    await axios.patch(`http://localhost:3000/foods/${id}/approve`);
    
    messaggio.value = "Alimento approvato ed inserito ufficialmente nel catalogo!";
    await fetchProposals(); // Ricarica la lista
  } catch (err) {
    console.error("Errore approvazione:", err);
    errore.value = "Errore durante l'approvazione del cibo.";
  }
};

const rifiutaProposta = async (id) => {
  if (!confirm("Sei sicuro di voler scartare ed eliminare questa proposta?")) return;
  
  messaggio.value = '';
  errore.value = '';
  try {
    await axios.delete(`http://localhost:3000/foods/${id}`);
    messaggio.value = "Proposta scartata ed eliminata con successo.";
    await fetchProposals();
  } catch (err) {
    console.error("Errore eliminazione proposta:", err);
    errore.value = "Errore durante l'eliminazione della proposta.";
  }
};

onMounted(() => {
  fetchProposals();
});
</script>

<style scoped>
.card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4) !important;
}
.text-light-50 {
  color: rgba(248, 249, 250, 0.6) !important;
}
</style>