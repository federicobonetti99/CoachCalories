<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import replaceByDefault from '@/lib/replaceByDefault';

// Riceviamo la prop passata da App.vue
const props = defineProps(['foodId']);
const foodId = props.foodId;

// Dichiariamo l'emit per tornare al catalogo
const emit = defineEmits(['navigate']);

// Dati dell'alimento
const food = ref({
  nome: '',
  quantita: '',
  unita: '',
  calorie: '',
  carboidrati_g: '',
  proteine_g: '',
  grassi_g: '',
  note: '',
  img: ''
});

const fileSelezionato = ref(null);
const risposta = ref('');
const errore = ref('');

// Proprietà calcolata per gestire l'immagine
const imageUrl = computed(() => {
  // Se l'utente ha selezionato un'immagine dal computer, creiamo l'anteprima temporanea
  if (fileSelezionato.value) {
    return URL.createObjectURL(fileSelezionato.value);
  }
  
  // Se c'è un'immagine salvata dal server
  if (food.value.img) {
    // Se è un URL assoluto
    if (food.value.img.startsWith('http') || food.value.img.startsWith('/')) {
      return food.value.img;
    }
    
    // Percorso relativo corretto dalla cartella src/pages alla cartella frontend/img/foods
    return `../../img/foods/${food.value.img}`;
  }
  
  return '';
});

// Carica i dati dell'alimento dal server
const caricaAlimento = async () => {
  try {
    const response = await axios.get(`http://localhost:3000/foods/${foodId}`);
    food.value = response.data;
  } catch (err) {
    errore.value = "Errore nel caricamento dei dati dell'alimento.";
    console.error("Errore:", err);
  }
};

// Gestione del file selezionato
const selezionaFile = (event) => {
  fileSelezionato.value = event.target.files[0];
};

// Invio dell'aggiornamento
const aggiornaAlimento = async () => {
  errore.value = '';
  risposta.value = 'Aggiornamento in corso...';

  const fd = new FormData();
  fd.append('nome', food.value.nome);
  fd.append('calorie', food.value.calorie || 0);
  fd.append('proteine', food.value.proteine_g || 0);
  fd.append('grassi', food.value.grassi_g || 0);
  fd.append('carboidrati', food.value.carboidrati_g || 0);
  fd.append('quantita', food.value.quantita || 100);
  fd.append('unita', food.value.unita || 'g');
  fd.append('note', food.value.note || '');

  // Gestione dell'immagine
  if (fileSelezionato.value) {
    fd.append('image', fileSelezionato.value);
  }

  try {
    const res = await axios.put(`http://localhost:3000/foods/${foodId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    risposta.value = "Alimento aggiornato con successo!";
    
    // Torna indietro al catalogo dopo un paio di secondi
    setTimeout(() => {
      emit('navigate', 'Catalog');
    }, 1500);
    
  } catch (err) {
    risposta.value = '';
    errore.value = err.response?.data?.message || "Errore durante l'aggiornamento.";
    console.error("Dettaglio Errore:", err);
  }
};

onMounted(caricaAlimento);
</script>

<template>
  <section class="container mt-4 mb-5">
    <div class="row justify-content-center">
      <div class="col-md-8 col-lg-6">
        
        <div class="card shadow-sm border-0 rounded-4 p-4">
          <h2 class="text-success fw-bold mb-4 text-center">Modifica Alimento</h2>

          <div v-if="errore" class="text-center">
            <div class="alert alert-danger py-2 fw-bold">
              {{ errore }}
            </div>
            <button type="button" class="btn btn-outline-secondary mt-2" @click="$emit('navigate', 'Catalog')">
              Torna indietro
            </button>
          </div>

          <div v-if="risposta" class="alert alert-success py-2 text-center fw-bold">
            {{ risposta }}
          </div>

          <form v-if="!errore" @submit.prevent="aggiornaAlimento">
            
            <div class="mb-3">
              <label class="form-label fw-bold text-muted">Nome Alimento</label>
              <input v-model="food.nome" type="text" class="form-control" required />
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label fw-bold text-muted">Quantità</label>
                <input v-model="food.quantita" type="number" class="form-control" required />
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label fw-bold text-muted">Unità di Misura</label>
                <input v-model="food.unita" type="text" class="form-control" placeholder="es. g, ml, pz" required />
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold text-muted">Calorie (kcal)</label>
              <input v-model="food.calorie" type="number" class="form-control" required />
            </div>

            <div class="row">
              <div class="col-md-4 mb-3">
                <label class="form-label fw-bold text-muted">Carboidrati (g)</label>
                <input v-model="food.carboidrati_g" type="number" step="0.1" class="form-control" />
              </div>
              <div class="col-md-4 mb-3">
                <label class="form-label fw-bold text-muted">Proteine (g)</label>
                <input v-model="food.proteine_g" type="number" step="0.1" class="form-control" />
              </div>
              <div class="col-md-4 mb-3">
                <label class="form-label fw-bold text-muted">Grassi (g)</label>
                <input v-model="food.grassi_g" type="number" step="0.1" class="form-control" />
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold text-muted">Note aggiuntive</label>
              <input v-model="food.note" type="text" class="form-control" placeholder="es. Fonte di fibre..." />
            </div>

            <div v-if="imageUrl" class="mb-3">
              <label class="form-label fw-bold text-muted d-block">Immagine Attuale</label>
              <img 
                :src="imageUrl" 
                class="img-fluid rounded mb-2 border" 
                alt="Immagine Alimento" 
                style="max-height: 150px; object-fit: cover;" 
                @error="replaceByDefault" 
              />
            </div>

            <div class="mb-4">
              <label class="form-label fw-bold text-muted">Cambia Immagine</label>
              <input type="file" class="form-control" @change="selezionaFile" accept="image/*" />
            </div>

            <div class="d-flex justify-content-between gap-3">
              <button type="button" class="btn btn-outline-secondary w-50" @click="$emit('navigate', 'Catalog')">
                Annulla
              </button>
              <button type="submit" class="btn btn-success w-50 fw-bold">
                Salva Modifiche
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  </section>
</template>

<style scoped>
.card {
  background-color: #f8f9fa;
  border-left: 6px solid #198754;
}

.form-control:focus {
  border-color: #198754;
  box-shadow: 0 0 0 0.25rem rgba(25, 135, 84, 0.25);
}
</style>