<script setup>
import { ref } from 'vue';
import axios from 'axios'; 
import replaceByDefault from "@/lib/replaceByDefault";
import { onMounted } from 'vue'

// Definiamo gli emit corretti
const emit = defineEmits(['login-success']);

const email = ref('');
const password = ref('');
const errorMessage = ref(''); 

const handleLogin = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: email.value,
      password: password.value
    });

if (response.data.success) {
      // Dati base obbligatori
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('authGrade', response.data.authenticationGrade);
      localStorage.setItem('username', response.data.username);
      localStorage.setItem('userEmail', response.data.email);

      if (response.data.weight !== undefined && response.data.weight !== null) {
        localStorage.setItem('weight', response.data.weight);
        localStorage.setItem('height', response.data.height);
        localStorage.setItem('age', response.data.age);
        localStorage.setItem('gender', response.data.gender);
        localStorage.setItem('activityLevel', response.data.activityLevel);
        console.log("Dati fisiologici salvati con successo:", response.data.weight + "kg");
      } else {
        console.warn("Dati fisiologici non trovati nella risposta del server.");
      }

      // Comunichiamo ad App.vue che il login è riuscito
      emit('login-success');
    }
  } catch (error) {
    console.error('Errore durante il login:', error);
    errorMessage.value = 'Credenziali errate o errore del server';
    alert('Credenziali errate o errore del server');
  }
};

onMounted(() => {
  localStorage.removeItem("token");
  localStorage.removeItem("authGrade");
  localStorage.removeItem("username");
  
  console.log("Dati di accesso azzerati all'apertura del LoginContainer.");
});
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

            <div v-if="errorMessage" class="alert alert-danger py-2 mb-3 text-center small fw-bold">
              ⚠️    {{ errorMessage }}
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

.coverImage {
  filter: blur(12px);
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  z-index: 1;
}

.coverImage img {
  width: 100%; height: 100%; object-fit: cover; transform: scale(1.1);
}

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