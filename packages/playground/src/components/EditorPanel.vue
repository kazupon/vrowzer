<script setup lang="ts">
import { ref, watch } from "vue";

const emit = defineEmits<{
  (e: "update", code: string): void;
}>();

const defaultCode = `// Counter example with HMR
let count = 0

function render() {
  document.body.innerHTML = \`
    <div style="text-align: center; padding: 20px;">
      <h1>Counter: \${count}</h1>
      <button id="increment">+1</button>
      <button id="decrement">-1</button>
    </div>
  \`

  document.getElementById('increment').onclick = () => {
    count++
    render()
  }

  document.getElementById('decrement').onclick = () => {
    count--
    render()
  }
}

render()

// HMR: preserve count state across updates
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('[HMR] Module updated!')
  })
}
`;

const code = ref(defaultCode);

watch(
  code,
  (newCode) => {
    emit("update", newCode);
  },
  { immediate: true },
);
</script>

<template>
  <div class="editor-panel">
    <div class="editor-header">
      <span>main.js</span>
    </div>
    <textarea
      v-model="code"
      class="editor-textarea"
      spellcheck="false"
    ></textarea>
  </div>
</template>

<style scoped>
.editor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
}

.editor-header {
  padding: 8px 12px;
  background: #252526;
  color: #cccccc;
  font-size: 13px;
  border-bottom: 1px solid #3c3c3c;
}

.editor-textarea {
  flex: 1;
  width: 100%;
  padding: 12px;
  background: #1e1e1e;
  color: #d4d4d4;
  border: none;
  outline: none;
  resize: none;
  font-family: "Fira Code", "Consolas", "Monaco", monospace;
  font-size: 14px;
  line-height: 1.5;
  tab-size: 2;
}

.editor-textarea::placeholder {
  color: #6a6a6a;
}
</style>
