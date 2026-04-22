<script setup>
import replaceByDefault from "@/lib/replaceByDefault"
const props = defineProps(["food"])
</script>

<template>
  <div class="card mb-4 shadow-sm food-card">
    <div class="row g-0 align-items-center">
      <div class="col-md-5 col-lg-4">
        <img 
          v-if="food.img" 
          :src="food.img" 
          class="img-fluid rounded-start food-img" 
          alt="food" 
          @error="replaceByDefault" 
        />
      </div>
      
      <div class="col-md-7 col-lg-8">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h5 class="card-title fw-bold m-0 text-capitalize">{{ food.nome }}</h5>
            <span class="badge rounded-pill bg-dark">{{ food.calorie }} kcal</span>
          </div>

          <p class="card-text small text-muted mb-3">{{ food.note }}</p>

          <div class="macro-container bg-light rounded p-2">
            <div class="row g-0 text-center">
              <div class="col-4 border-end">
                <div class="macro-label">Carbs</div>
                <div class="macro-value text-warning">{{ food.carboidrati_g }}g</div>
              </div>
              <div class="col-4 border-end">
                <div class="macro-label">Prot</div>
                <div class="macro-value text-danger">{{ food.proteine_g }}g</div>
              </div>
              <div class="col-4">
                <div class="macro-label">Grassi</div>
                <div class="macro-value text-info">{{ food.grassi_g }}g</div>
              </div>
            </div>
          </div>
          
          <div class="mt-3 d-flex justify-content-between align-items-center">
            <small class="text-secondary">⚖️ {{ food.quantita }}{{ food.unita }}</small>
            <button class="btn btn-sm btn-outline-success">Aggiungi +</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.food-card {
  border: none;
  border-radius: 15px;
  overflow: hidden;
  transition: all 0.3s ease;
  border-left: 6px solid #198754;
}

.food-card:hover {
  transform: translateY(-5px);
  /*shadow: 0 10px 20px rgba(0,0,0,0.1);*/
}

.food-img {
  height: 200px;
  width: 100%;
  object-fit: cover;
}

.macro-container {
  border: 1px solid #e9ecef;
}

.macro-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
  color: #6c757d;
}

.macro-value {
  font-size: 1rem;
  font-weight: 800;
}

.card-title {
  font-size: 1.1rem;
  color: #212529;
}
</style>
