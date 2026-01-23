<script setup lang="ts">
import { ref, watch } from 'vue'

const emit = defineEmits<{
  (e: 'update', code: string): void
}>()

const defaultCode = `// Counter + Fetch request handle on Vite like dev server example
let count = 0
let serverMessage = ''

async function fetchHello() {
  try {
    const res = await fetch('/__preview__/hello')
    serverMessage = await res.text()
  } catch (e) {
    serverMessage = 'Error: ' + e.message
  }
  render()
}

function render() {
  document.getElementById('app').innerHTML = \`
    <div style="text-align: center; padding: 20px;">
      <h2>Vite like dev server Response:</h2>
      <p style="color: #646cff; font-weight: bold;">\${serverMessage}</p>
      <hr style="margin: 20px 0; border-color: #333;">
      <h1>Counter: \${count}</h1>
      <button id="increment">+1</button>
      <button id="decrement">-1</button>
      <button id="refresh" style="margin-left: 10px;">Fetch /hello</button>
    </div>
  \`

  document.getElementById('increment')?.addEventListener('click', () => {
    count++
    render()
  })

  document.getElementById('decrement')?.addEventListener('click', () => {
    count--
    render()
  })

  document.getElementById('refresh')?.addEventListener('click', fetchHello)
}

render()
`

const code = ref(defaultCode)

watch(
  code,
  newCode => {
    emit('update', newCode)
  },
  { immediate: true }
)
</script>

<template>
  <div class="editor-panel">
    <div class="editor-header">
      <span class="file-icon">JS</span>
      <span class="file-name">main.js</span>
    </div>
    <textarea v-model="code" class="editor-textarea" spellcheck="false"></textarea>
  </div>
</template>

<style scoped>
.editor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1a1a1a;
  border-right: 1px solid #2e2e2e;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(180deg, #242424 0%, #1a1a1a 100%);
  border-bottom: 1px solid #646cff33;
}

.file-icon {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  background: linear-gradient(135deg, #f7df1e 0%, #d4a017 100%);
  color: #1a1a1a;
  border-radius: 4px;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #e0e0e0;
}

.editor-textarea {
  flex: 1;
  width: 100%;
  padding: 16px;
  background: #1a1a1a;
  color: #e0e0e0;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Fira Code', 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.6;
  tab-size: 2;
}

.editor-textarea:focus {
  background: #1e1e1e;
}

.editor-textarea::placeholder {
  color: #555;
}

.editor-textarea::selection {
  background: #646cff;
  color: white;
}
</style>
