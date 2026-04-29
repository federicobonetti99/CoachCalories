<template>
  <div style="padding: 20px; border: 2px solid #ccc;">
    <h3>Test Rapido Caricamento</h3>
    <input type="file" @change="selezionaFile" />
    <button @click="inviaTest" style="margin-left: 10px;">
      PROVA CARICAMENTO
    </button>
    
    <p v-if="risposta" style="color: green; font-weight: bold;">{{ risposta }}</p>
    <p v-if="errore" style="color: red;">{{ errore }}</p>
  </div>
</template>


<script setup>
import { ref } from 'vue';
import axios from 'axios';

const fileSelezionato = ref(null);
const risposta = ref('');
const errore = ref('');

const selezionaFile = (event) => {
  // CORRETTO: si usa .value, non .ref
  fileSelezionato.value = event.target.files[0];
};

const inviaTest = async () => {
  if (!fileSelezionato.value) {
    errore.value = "Seleziona prima un file!";
    return;
  }

  risposta.value = '';
  errore.value = '';
  
  const fd = new FormData();
  // CORRETTO: .value
  fd.append('image', fileSelezionato.value);

  try {
    const res = await axios.post('http://localhost:3000/test/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    // CORRETTO: il tuo backend risponde con .message, non .messaggio
    risposta.value = res.data.message; 
    console.log("Successo:", res.data);
  } catch (err) {
    errore.value = "Errore nel caricamento. Guarda la console!";
    console.error("Dettaglio Errore:", err.response ? err.response.data : err.message);
  }
};
</script>
