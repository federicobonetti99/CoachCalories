<script setup>
import { ref } from 'vue';
import axios from 'axios';

const food = ref({
    nome: '',
    calorie: 0,
    proteine: 0,
    grassi: 0,
    carboidrati: 0,
    quantita: 100,
    unitaMisura: 'g'
});

const imageFile = ref(null);
const previewUrl = ref(null);
const opzioniUnita = ['g', 'ml', 'porzione', 'pz', 'bicchiere'];

const onFileSelected = (event) => {
    const file = event.target.files[0];
    if (file) {
        imageFile.value = file;
        previewUrl.value = URL.createObjectURL(file);
    }
};

const handleSubmit = async () => {
    try {
        const formData = new FormData();
        formData.append('nome', food.value.nome);
        formData.append('calorie', food.value.calorie);
        formData.append('proteine', food.value.proteine);
        formData.append('grassi', food.value.grassi);
        formData.append('carboidrati', food.value.carboidrati);
        formData.append('quantita', food.value.quantita);
        formData.append('unitaMisura', food.value.unitaMisura);
        
        if (imageFile.value) {
            formData.append('image', imageFile.value);
        }

        const response = await axios.post('http://localhost:3000/foods/add', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.status === 201 || response.status === 200) {
            alert("✅ Alimento salvato!");
            food.value = { nome: '', calorie: 0, proteine: 0, grassi: 0, carboidrati: 0, quantita: 100, unitaMisura: 'g' };
            imageFile.value = null;
            previewUrl.value = null;
            document.querySelector('input[type="file"]').value = '';
        }
    } catch (error) {
        alert("❌ Errore nel caricamento.");
    }
};
</script>

<template>
  <div class="container mt-5 mb-5">
    <div class="row justify-content-center">
      <div class="col-md-10 col-lg-8">
        <div class="card bg-dark text-white shadow-lg p-4 border-0 rounded-4">
          
          <div class="text-center mb-4">
            <h2 class="text-success fw-bold">Gestione Database Alimenti</h2>
            <p class="text-white-50">Modulo inserimento</p>
          </div>

          <form @submit.prevent="handleSubmit">
            
            <div class="row mb-4 g-3 align-items-center">
              <div class="col-md-7">
                <label class="form-label fw-bold text-white">Nome Alimento</label>
                <input v-model="food.nome" type="text" class="form-control form-control-lg bg-dark text-white border-secondary">
              </div>
              <div class="col-md-5">
                <label class="form-label fw-bold text-white">Foto (File)</label>
                <input type="file" @change="onFileSelected" class="form-control bg-dark text-white border-secondary">
              </div>
            </div>

            <div v-if="previewUrl" class="text-center mb-4 p-3 bg-black rounded-3">
                <img :src="previewUrl" class="img-fluid rounded-3 border border-secondary" style="max-height: 180px;">
            </div>

            <hr class="border-secondary mb-4">

            <div class="row mb-4 align-items-end bg-black p-3 rounded-3 mx-0">
              <div class="col-md-6 mb-2">
                <label class="form-label text-white fw-bold">Quantità Base</label>
                <input v-model="food.quantita" type="number" class="form-control bg-dark text-white border-info text-center fs-5">
              </div>
              <div class="col-md-6">
                <label class="form-label text-white fw-bold">Unità di Misura</label>
                <select v-model="food.unitaMisura" class="form-select bg-dark text-white border-info text-center fs-5">
                  <option v-for="unita in opzioniUnita" :key="unita" :value="unita">{{ unita }}</option>
                </select>
              </div>
            </div>

            <div class="row mb-4 g-3">
              <div class="col-md-3">
                <div class="p-3 bg-black rounded-3 border-start border-warning border-4">
                  <label class="small text-white d-block text-uppercase fw-bold mb-1">Kcal</label>
                  <input v-model="food.calorie" type="number" class="form-control-plaintext text-white fs-3 fw-bold p-0 text-center">
                </div>
              </div>
              <div class="col-md-3">
                <div class="p-3 bg-black rounded-3 border-start border-success border-4">
                  <label class="small text-white d-block text-uppercase fw-bold mb-1">Proteine (g)</label>
                  <input v-model="food.proteine" type="number" class="form-control-plaintext text-white fs-3 fw-bold p-0 text-center">
                </div>
              </div>
              <div class="col-md-3">
                <div class="p-3 bg-black rounded-3 border-start border-danger border-4">
                  <label class="small text-white d-block text-uppercase fw-bold mb-1">Grassi (g)</label>
                  <input v-model="food.grassi" type="number" class="form-control-plaintext text-white fs-3 fw-bold p-0 text-center">
                </div>
              </div>
              <div class="col-md-3">
                <div class="p-3 bg-black rounded-3 border-start border-primary border-4">
                  <label class="small text-white d-block text-uppercase fw-bold mb-1">Carbs (g)</label>
                  <input v-model="food.carboidrati" type="number" class="form-control-plaintext text-white fs-3 fw-bold p-0 text-center">
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

<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.form-control:focus, .form-select:focus {
    background-color: #2b3035;
    border-color: #deff9a;
    color: white;
    box-shadow: none;
}
</style>