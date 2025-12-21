<script setup lang="ts">
import { ref } from "vue";
import EditorPanel from "./components/EditorPanel.vue";
import PreviewPanel from "./components/PreviewPanel.vue";

const currentCode = ref("");

function handleCodeUpdate(code: string) {
  currentCode.value = code;
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>Proto2 - Service Worker HMR</h1>
      <span class="subtitle">Service Worker + Web Worker + iframe</span>
    </header>
    <main class="app-main">
      <EditorPanel @update="handleCodeUpdate" />
      <PreviewPanel :code="currentCode" />
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #323233;
  border-bottom: 1px solid #3c3c3c;
}

.app-header h1 {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.subtitle {
  font-size: 12px;
  color: #888888;
}

.app-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}
</style>
