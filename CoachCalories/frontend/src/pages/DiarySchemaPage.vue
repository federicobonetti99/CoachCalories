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

const fetchAndRender = async () => {
  try {
    const response = await axios.get(`http://localhost:3000/api/diary/history?username=${username.value}`);
    historyData.value = response.data;

    // Se ci sono meno di due giorni, non disegniamo i grafici
    if (historyData.value.length < 2) {
      return;
    }

    const labels = historyData.value.map(h => h.date);
    
    // 🟢 Estrazione dei dati con conversione a Number esplicita
    const calories = historyData.value.map(h => Number(h.totals?.calorie) || 0);
    const carbs = historyData.value.map(h => Number(h.totals?.carboidrati_g) || 0);
    const proteins = historyData.value.map(h => Number(h.totals?.proteine_g) || 0);
    const fats = historyData.value.map(h => Number(h.totals?.grassi_g) || 0);

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
              label: 'Calorie (kcal)',
              data: calories,
              borderColor: '#198754', // Verde
              backgroundColor: 'rgba(25, 135, 84, 0.1)',
              fill: false,
              tension: 0.4,
              pointRadius: 5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#fff', font: { size: 14 } } }
          },
          scales: {
            y: { 
              grid: { color: 'rgba(255, 255, 255, 0.1)' }, 
              ticks: { color: '#fff' } 
            },
            x: { 
              grid: { display: false }, 
              ticks: { color: '#fff' } 
            }
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
            {
              label: 'Carbs (g)',
              data: carbs,
              borderColor: '#ffc107', // Giallo
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              fill: false,
              tension: 0.4,
              pointRadius: 5
            },
            {
              label: 'Proteine (g)',
              data: proteins,
              borderColor: '#dc3545', // Rosso
              backgroundColor: 'rgba(220, 53, 69, 0.1)',
              fill: false,
              tension: 0.4,
              pointRadius: 5
            },
            {
              label: 'Grassi (g)',
              data: fats,
              borderColor: '#0dcaf0', // Azzurro
              backgroundColor: 'rgba(13, 202, 240, 0.1)',
              fill: false,
              tension: 0.4,
              pointRadius: 5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#fff', font: { size: 14 } } }
          },
          scales: {
            y: { 
              grid: { color: 'rgba(255, 255, 255, 0.1)' }, 
              ticks: { color: '#fff' } 
            },
            x: { 
              grid: { display: false }, 
              ticks: { color: '#fff' } 
            }
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
        <p class="text-white-50">Visualizza separatamente il bilancio calorico e l'assunzione di macronutrienti.</p>
      </div>
    </div>

    <div v-if="historyData.length < 2" class="card bg-dark border-secondary shadow-lg p-4 rounded-4 mb-4">
      <div class="text-center text-white py-5">
        <i class="fa-solid fa-chart-line fs-1 text-success mb-3"></i>
        <h4>Ancora pochi dati per l'analisi</h4>
        <p class="text-white-50">Continua ad aggiungere alimenti al diario nei prossimi giorni per vedere il tuo andamento!</p>
      </div>
    </div>

    <div v-else class="d-flex flex-column gap-4 mb-5">
      
      <div class="card bg-dark border-secondary shadow-lg p-4 rounded-4">
        <h4 class="text-success text-center mb-4">Andamento Calorie</h4>
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

<style scoped>
</style>