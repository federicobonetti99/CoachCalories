<script setup>
import { ref } from "vue";
import { useCounterStore } from "../store/counter";

const props = defineProps(["routeName"])

const { increment } = useCounterStore()

const count = ref(0)
const onClicked = () => {
  increment()
  count.value++
}
</script>

<template>
  <li class="nav-item">
    <RouterLink 
      :to="{ name: props.routeName }"
      class="nav-link" @click="onClicked">
      {{ props.routeName }} (Count: {{ count }})
    </RouterLink>
  </li>
</template>

<style scoped>
li {
  cursor: pointer;
}
</style>
