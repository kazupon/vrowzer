<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
const message = ref('Hello from Vue SFC!')
</script>

<template>
  <div class="app">
    <h1>{{ message }}</h1>
    <button @click="count++">Count: {{ count }}</button>
    <p>Powered by Vrowser + @vitejs/plugin-vue</p>
  </div>
</template>

<style scoped>
.app {
  font-family: sans-serif;
  text-align: center;
  padding: 2rem;
}
button {
  font-size: 1.2rem;
  padding: 0.5rem 1.5rem;
  cursor: pointer;
}
</style>
