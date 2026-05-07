<script setup>
import { ref, onMounted, nextTick } from 'vue';
import axios from 'axios';
import Chart from 'chart.js/auto';

const username = ref(localStorage.getItem('username'));
const chartCalRef = ref(null);
const chartMacroRef = ref(null);
let calChart = null;
let macroChart = null;

const historyData = ref([]);
const period = ref(7); // <--- AGGIUNTO: Periodo di default

// --- LOGICA CALCOLO TDEE ---
const getTDEE = () => {
  const weight = parseFloat(localStorage.getItem('weight')) || 0;
  const height = parseFloat(localStorage.getItem('height')) || 0;
  const age = parseInt(localStorage.getItem('age')) || 0;
  const gender = localStorage.getItem('gender') || 'M';
  const activityLevel = localStorage.getItem('activityLevel') || 'moderate';

  if (weight === 0 || height === 0 || age === 0) return 2000;

  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr = (gender === 'M') ? bmr + 5 : bmr - 161;

  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
    extra: 1.9
  };

  return Math.round(bmr * (multipliers[activityLevel] || 1.2));
};

const maintenanceCalories = ref(getTDEE());

// --- FUNZIONE PER CAMBIARE PERIODO ---
const changePeriod = (p) => {
  period.value = p;
  fetchAndRender();
};

const fetchAndRender = async () => {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/diary/history?username=${username.value}&days=${period.value}`
    );
    historyData.value = response.data;

    // Se non c'è proprio nulla, non renderizzare i grafici
    if (historyData.value.length === 0) return;

    const labels = historyData.value.map(h => h.date);
    const calories = historyData.value.map(h => Number(h.totals?.calorie) || 0);
    const carbs = historyData.value.map(h => Number(h.totals?.carboidrati_g) || 0);
    const proteins = historyData.value.map(h => Number(h.totals?.proteine_g) || 0);
    const fats = historyData.value.map(h => Number(h.totals?.grassi_g) || 0);

    const maintenanceLine = labels.map(() => maintenanceCalories.value);

    await nextTick();

    // 1. Grafico Calorie
    if (chartCalRef.value) {
      if (calChart) calChart.destroy();
      const ctxCal = chartCalRef.value.getContext('2d');
      calChart = new Chart(ctxCal, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Calorie Assunte (kcal)',
              data: calories,
              borderColor: '#198754',
              backgroundColor: 'rgba(25, 135, 84, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 5
            },
            {
              label: 'Mantenimento Stimato',
              data: maintenanceLine,
              borderColor: '#ffc107',
              borderDash: [5, 5],
              pointRadius: 0,
              fill: false,
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#fff' } }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#fff' } },
            x: { grid: { display: false }, ticks: { color: '#fff' } }
          }
        }
      });
    }

    // 2. Grafico Macronutrienti
    if (chartMacroRef.value) {
      if (macroChart) macroChart.destroy();
      const ctxMacro = chartMacroRef.value.getContext('2d');
      macroChart = new Chart(ctxMacro, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'Carbs (g)', data: carbs, borderColor: '#ffc107', tension: 0.4, pointRadius: 5 },
            { label: 'Proteine (g)', data: proteins, borderColor: '#dc3545', tension: 0.4, pointRadius: 5 },
            { label: 'Grassi (g)', data: fats, borderColor: '#0dcaf0', tension: 0.4, pointRadius: 5 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#fff' } }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#fff' } },
            x: { ticks: { color: '#fff' } }
          }
        }
      });
    }

  } catch (e) {
    console.error("Errore grafico:", e);
  }
};

onMounted(fetchAndRender);
</script>

<template>
  <div class="container mt-5">
    <div class="row">
      <div class="col-md-12 text-center mb-4">
        <h1 class="display-6 fw-bold text-success">Analisi Andamento</h1>
        <p class="text-white-50">Visualizza i tuoi progressi nel tempo.</p>
        
        <div class="d-flex justify-content-center gap-2 mt-3 mb-2">
          <button 
            class="btn btn-sm" 
            :class="period == 7 ? 'btn-success' : 'btn-outline-success'" 
            @click="changePeriod(7)"
          >Settimana</button>
          
          <button 
            class="btn btn-sm" 
            :class="period == 30 ? 'btn-success' : 'btn-outline-success'" 
            @click="changePeriod(30)"
          >Mese</button>
          
          <button 
            class="btn btn-sm" 
            :class="period == 'all' ? 'btn-success' : 'btn-outline-success'" 
            @click="changePeriod('all')"
          >Tutto</button>
        </div>
      </div>
    </div>

    <div v-if="historyData.length === 0" class="card bg-dark border-secondary shadow-lg p-4 rounded-4 mb-4">
      <div class="text-center text-white py-5">
        <i class="fa-solid fa-chart-line fs-1 text-success mb-3"></i>
        <h4>Nessun dato registrato</h4>
        <p class="text-white-50">Inizia ad aggiungere alimenti nel diario per vedere i progressi.</p>
      </div>
    </div>

    <div v-else class="d-flex flex-column gap-4 mb-5">
      <div class="card bg-dark border-secondary shadow-lg p-4 rounded-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
           <h4 class="text-success m-0">Andamento Calorie</h4>
           <div class="badge bg-warning text-dark p-2">Target: {{ maintenanceCalories }} kcal</div>
        </div>
        <div class="chart-container" style="height: 380px;">
          <canvas ref="chartCalRef"></canvas>
        </div>
      </div>

      <div class="card bg-dark border-secondary shadow-lg p-4 rounded-4">
        <h4 class="text-info text-center mb-4">Andamento Macronutrienti</h4>
        <div class="chart-container" style="height: 380px;">
          <canvas ref="chartMacroRef"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>