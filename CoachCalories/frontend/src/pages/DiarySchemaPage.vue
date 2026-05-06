<script setup>
import { ref, onMounted, nextTick, computed } from 'vue';
import axios from 'axios';
import Chart from 'chart.js/auto';

const username = ref(localStorage.getItem('username'));
const chartRef = ref(null);
let myChart = null;

// Salviamo i dati in una variabile reattiva per poter controllare la lunghezza nel template
const historyData = ref([]);

const fetchAndRender = async () => {
  try {
    const response = await axios.get(`http://localhost:3000/api/diary/history?username=${username.value}`);
    
    // 🟢 CONTROLLA LA CONSOLE
    console.log("Dati grezzi ricevuti dal server:", response.data); 
    
    historyData.value = response.data;

    if (historyData.value.length < 2) {
      console.warn("Dati insufficienti per il grafico");
      return;
    }
    
    // ... il resto del codice ...

    const labels = historyData.value.map(h => h.date);
    const calories = historyData.value.map(h => h.totals.calorie);

    await nextTick();
    const ctx = chartRef.value.getContext('2d');
    
    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Calorie Assunte (kcal)',
          data: calories,
          borderColor: '#198754',
          backgroundColor: 'rgba(25, 135, 84, 0.2)',
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointBackgroundColor: '#198754'
        }]
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
        <p class="text-white-50">Visualizza i tuoi progressi calorici settimanali.</p>
      </div>
    </div>

    <div class="card bg-dark border-secondary shadow-lg p-4 rounded-4">
      
      <div v-if="historyData.length < 2" class="text-center text-white py-5">
        <i class="fa-solid fa-chart-line fs-1 text-success mb-3"></i>
        <h4>Ancora pochi dati per l'analisi</h4>
        <p class="text-white-50">Continua ad aggiungere alimenti al diario nei prossimi giorni per vedere il tuo andamento!</p>
      </div>

      <div v-else class="chart-container" style="height: 400px;">
        <canvas ref="chartRef"></canvas>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
/* Aggiungi qui eventuali stili specifici */
</style>