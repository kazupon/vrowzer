<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div style="text-align: center; padding: 2rem; font-family: sans-serif;">
    <h1>Hello from Vrowser!</h1>
    <p>This Vue app is running inside a browser-based Vite dev server.</p>
    <button @click="count++">Count: {{ count }}</button>
  </div>
</template>
