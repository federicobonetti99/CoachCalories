<script setup>
import NavButton from "@/components/NavButton.vue";
import { useCounterStore } from "../store/counter.js";

const counterStore = useCounterStore();
</script>

<template>
  <nav class="navbar navbar-light bg-light navbar-expand-lg">
    <div class="container container-fluid">
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navContent">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <NavButton route-name="Home" />
          <NavButton route-name="Catalog" />
        </ul>
        <div>Total click: {{ counterStore.count }}</div>
      </div>
    </div>
  </nav>
</template>
