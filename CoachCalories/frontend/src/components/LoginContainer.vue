<script setup>
import { ref } from 'vue'
import replaceByDefault from "@/lib/replaceByDefault"

const email = ref('')
const password = ref('')

const handleLogin = () => {
  console.log("Login richiesto per:", email.value)
}
</script>

<template>
  <div class="homeContainer">
    <div class="last shadow-lg outer-green-border">
      
      <div class="coverImage">
        <img 
          src="/img/foods/risoBasmati.jpg" 
          class="card-img" 
          alt="Background" 
          @error="replaceByDefault" 
        />
      </div>
      
      <div class="pattern"></div>
      
      <div class="coverText">
        <div class="login-box shadow">
          
          <h2 class="text-center fw-bold mb-4 text-white">COACH ACCESS</h2>
          
          <form @submit.prevent="handleLogin">
            
            <div class="mb-3">
              <label class="form-label small fw-bold text-white-50">EMAIL</label>
              <div class="input-group">
                <span class="input-group-text bg-dark border-secondary border-end-0">📧</span>
                <input 
                  v-model="email" 
                  type="email" 
                  class="form-control bg-dark text-white border-secondary border-start-0" 
                  placeholder="esempio: federico@email.it"
                  required
                >
              </div>
            </div>
            
            <div class="mb-4">
              <label class="form-label small fw-bold text-white-50">PASSWORD</label>
              <div class="input-group">
                <span class="input-group-text bg-dark border-secondary border-end-0">🔒</span>
                <input 
                  v-model="password" 
                  type="password" 
                  class="form-control bg-dark text-white border-secondary border-start-0" 
                  placeholder="••••••••••••"
                  required
                >
              </div>
            </div>

            <button type="submit" class="btn btn-coach w-100 fw-bold py-2 mb-3">
              ACCEDI AL SISTEMA
            </button>
          </form>

          <div class="text-center">
            <a href="#" class="text-white-50 small text-decoration-none hover-white">Password dimenticata?</a>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.homeContainer {
  margin-bottom: 50px;
}

/* Container esterno con bordo verde richiesto */
.outer-green-border {
  border: 4px solid #198754 !important; /* Bordo verde esterno */
}

.last {
  margin: 50px;
  border-radius: 30px;
  height: 600px; 
  position: relative;
  overflow: hidden;
}

/* Effetto Sfondo */
.coverImage {
  filter: blur(12px); /* Un po' più di blur per far risaltare il riso ma leggere il form */
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  z-index: 1;
}

.coverImage img {
  width: 100%; height: 100%; object-fit: cover; transform: scale(1.1);
}

/* Pattern puntini */
.pattern {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background-image: url("https://pngimg.com/uploads/dot/dot_PNG4.png");
  background-repeat: repeat;
  background-size: 5px;
  opacity: 0.2;
  z-index: 2;
}

/* Centratore del form */
.coverText {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  display: flex; justify-content: center; align-items: center;
  z-index: 3;
}

/* BOX LOGIN */
.login-box {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  border-radius: 20px;
  /* Contorno verde laterale del box interno */
  border-left: 10px solid #198754; 
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.input-group-text {
  font-size: 1.2rem;
}

/* Stile placeholder */
::placeholder {
  color: rgba(255, 255, 255, 0.4) !important;
  opacity: 1;
}

.form-control:focus {
  border-color: #198754 !important;
  box-shadow: 0 0 0 0.25rem rgba(25, 135, 84, 0.25);
}

.btn-coach {
  background-color: #198754;
  color: white;
  border: none;
  transition: all 0.3s ease;
}

.btn-coach:hover {
  background-color: #146c43;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(25, 135, 84, 0.4);
}

.hover-white:hover {
  color: white !important;
}
</style>