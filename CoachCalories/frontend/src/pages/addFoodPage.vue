<template>
  <div class="container mt-5 mb-5">
    <div class="row justify-content-center">
      <div class="col-md-10 col-lg-8">
        <div class="card bg-dark text-white shadow-lg p-4 border-0 rounded-4">
          
          <div class="text-center mb-4">
            <h2 class="text-success fw-bold">Gestione Database Alimenti</h2>
            <p class="text-white-50">Modulo inserimento</p>
          </div>

          <form @submit.prevent="inviaTest">
            
            <div class="row mb-4 g-3 align-items-center">
              <div class="col-md-7">
                <label class="form-label fw-bold text-white">Nome Alimento</label>
                <input v-model="dummyData.nome" type="text" class="form-control form-control-lg bg-dark text-white border-secondary">
              </div>
              <div class="col-md-5">
                <label class="form-label fw-bold text-white">Foto (File)</label>
                <input type="file" @change="selezionaFile" class="form-control bg-dark text-white border-secondary">
              </div>
            </div>

            <div class="text-center mb-3">
              <p v-if="risposta" class="text-success fw-bold small">✅ {{ risposta }}</p>
              <p v-if="errore" class="text-danger fw-bold small">❌ {{ errore }}</p>
            </div>

            <hr class="border-secondary mb-4">

            <div class="row mb-4 align-items-end bg-black p-3 rounded-3 mx-0">
              <div class="col-md-6 mb-2">
                <label class="form-label text-white fw-bold">Quantità Base</label>
                <input v-model="dummyData.quantita" type="number" class="form-control bg-dark text-white border-info text-center fs-5">
              </div>
              <div class="col-md-6">
                <label class="form-label text-white fw-bold">Unità di Misura</label>
                <select v-model="dummyData.unitaMisura" class="form-select bg-dark text-white border-info text-center fs-5">
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                </select>
              </div>
            </div>

            <div class="row mb-4 g-3">
              <div class="col-md-3">
                <div class="p-3 bg-black rounded-3 border-start border-warning border-4">
                  <label class="small text-white d-block text-uppercase fw-bold mb-1">Kcal</label>
                  <input v-model="dummyData.calorie" type="number" class="form-control-plaintext text-white fs-3 fw-bold p-0 text-center">
                </div>
              </div>
              <div class="col-md-3">
                <div class="p-3 bg-black rounded-3 border-start border-success border-4">
                  <label class="small text-white d-block text-uppercase fw-bold mb-1">Proteine (g)</label>
                  <input v-model="dummyData.proteine" type="number" class="form-control-plaintext text-white fs-3 fw-bold p-0 text-center">
                </div>
              </div>
              <div class="col-md-3">
                <div class="p-3 bg-black rounded-3 border-start border-danger border-4">
                  <label class="small text-white d-block text-uppercase fw-bold mb-1">Grassi (g)</label>
                  <input v-model="dummyData.grassi" type="number" class="form-control-plaintext text-white fs-3 fw-bold p-0 text-center">
                </div>
              </div>
              <div class="col-md-3">
                <div class="p-3 bg-black rounded-3 border-start border-primary border-4">
                  <label class="small text-white d-block text-uppercase fw-bold mb-1">Carbs (g)</label>
                  <input v-model="dummyData.carboidrati" type="number" class="form-control-plaintext text-white fs-3 fw-bold p-0 text-center">
                </div>
              </div>
            </div>

            <button type="submit" class="btn btn-success btn-lg w-100 fw-bold py-3 shadow-lg border-0">
                💾 SALVA ALIMENTO NEL CLOUD
            </button>

          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import axios from 'axios';

// Definiamo gli emit per la navigazione manuale
const emit = defineEmits(['navigate']);

const initialState = {
  nome: '',
  quantita: 100,
  unitaMisura: 'g',
  calorie: 0,
  proteine: 0,
  grassi: 0,
  carboidrati: 0
};

// Inizializziamo dummyData con una copia dello stato iniziale
const dummyData = reactive({ ...initialState });

const fileSelezionato = ref(null);
const risposta = ref('');
const errore = ref('');

const selezionaFile = (event) => {
  fileSelezionato.value = event.target.files[0];
};

const resetForm = () => {
  // 1. Reset dei campi testo e numeri
  Object.assign(dummyData, initialState);
  
  // 2. Reset del file e dei messaggi
  fileSelezionato.value = null;
  
  // 3. Reset manuale dell'input file nel DOM (opzionale ma consigliato)
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) fileInput.value = "";
};

const inviaTest = async () => {
  if (!fileSelezionato.value || !dummyData.nome) {
    errore.value = "Inserisci un nome e seleziona un file!";
    return;
  }

  risposta.value = 'Caricamento...';
  errore.value = '';
  
  const fd = new FormData();
  fd.append('nome', dummyData.nome); 
  fd.append('calorie', dummyData.calorie || 0);
  fd.append('proteine', dummyData.proteine || 0);
  fd.append('grassi', dummyData.grassi || 0);
  fd.append('carboidrati', dummyData.carboidrati || 0);
  fd.append('quantita', dummyData.quantita || 100);
  fd.append('unita', dummyData.unitaMisura || 'g');
  fd.append('image', fileSelezionato.value); 

  try {
    const res = await axios.post('http://localhost:3000/foods/add', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    risposta.value = "✅ " + res.data.message;
    
    // ✨ SVUOTIAMO IL FORM
    resetForm();

    // Se vuoi comunque cambiare pagina dopo un po':
    setTimeout(() => {
      risposta.value = '';
      emit('navigate', 'Catalog'); 
    }, 2000); 
    
  } catch (err) {
    errore.value = "Errore nel caricamento.";
    const errorDetail = err.response?.data?.message || err.message;
    console.error("Dettaglio Errore:", errorDetail);
  }
};
</script>