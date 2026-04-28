<script setup>
import NavButton from "@/components/NavButton.vue";
const props = defineProps(['userGrade']);
const emit = defineEmits(['logout', 'navigate']);
</script>

<template>
  <nav class="navbar navbar-light bg-light navbar-expand-lg shadow-sm">
    <div class="container-fluid container">
      
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navContent">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          
          <li class="nav-item">
            <a class="nav-link" href="#" @click.prevent="$emit('navigate', 'Home')">Home</a>
          </li>

          <li class="nav-item">
            <a class="nav-link" href="#" @click.prevent="$emit('navigate', 'Catalog')">Catalog</a>
          </li>

        </ul>
      </div>

      <div class="d-flex align-items-center ms-auto">
        <span class="me-3 small fw-bold text-muted text-uppercase d-none d-sm-inline">
          {{ userGrade || 'Ospite' }}
        </span>
        <button v-if="userGrade" @click="$emit('logout')" class="btn btn-outline-danger btn-sm">
          Esci
        </button>
      </div>

    </div>
  </nav>
</template>