<script setup lang="ts">
import { Vrowser } from 'vrowser'
import { onMounted, ref, useTemplateRef } from 'vue'
import EditorPanel from './components/EditorPanel.vue'

const editorPanel = useTemplateRef<InstanceType<typeof EditorPanel>>('editorPanel')
const previewContainer = useTemplateRef<HTMLElement>('previewContainer')
const isReady = ref(false)
const statusText = ref('Loading...')

const vrowser = Vrowser({ basePath: '/__preview__/' })

vrowser.on('reloadSuggested', info => {
  window.alert(
    `Service Worker has been updated (reason: ${info.reason}).\n` +
      `The page will be reloaded after closing this dialog.`
  )
  window.location.reload()
})

onMounted(async () => {
  // Collect initial files from EditorPanel
  const initialFiles: Record<string, string> = {}
  if (editorPanel.value?.files) {
    for (const [path, content] of editorPanel.value.files) {
      initialFiles[path] = content
    }
  }

  // Initialize preview system
  statusText.value = 'Initializing...'
  const ready = await vrowser.ready({ files: initialFiles })

  if (!ready) {
    statusText.value = 'Failed to initialize'
    return
  }

  // Mount preview iframe
  if (previewContainer.value) {
    await vrowser.mount(previewContainer.value)
  }

  isReady.value = true
  statusText.value = 'Ready'
})

function handleFileChange({ path, content }: { path: string; content: string }) {
  vrowser.updateFile(path, content)
}

function handleReload() {
  vrowser.reloadPreview()
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <img src="/favicon.svg" alt="Vrowser" class="app-logo" />
      <h1>Vrowser Playground</h1>
      <span class="subtitle">Vite Dev Server in the Browser</span>
    </header>
    <main class="app-main">
      <EditorPanel ref="editorPanel" @file-change="handleFileChange" />
      <div class="preview-panel">
        <div class="preview-header">
          <span>Preview by MessageChannel base HMR</span>
          <div class="status-container">
            <button v-if="isReady" class="reload-btn" title="Reload preview" @click="handleReload">
              Reload
            </button>
            <span :class="['status-dot', { ready: isReady }]" title="Service Worker"></span>
            <span :class="['status', isReady ? 'ready' : 'loading']">{{ statusText }}</span>
          </div>
        </div>
        <div class="preview-content">
          <div v-if="!isReady" class="loading-overlay">
            <p>{{ statusText }}</p>
          </div>
          <div ref="previewContainer" class="preview-iframe-container" />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1a1a1a;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-bottom: 1px solid #646cff33;
}

.app-logo {
  width: 28px;
  height: 28px;
}

.app-header h1 {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #41d1ff 0%, #bd34fe 50%, #41d1ff 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 12px;
  color: #888888;
  padding: 4px 10px;
  background: #646cff22;
  border-radius: 12px;
  border: 1px solid #646cff44;
}

.app-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

.preview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: linear-gradient(180deg, #242424 0%, #1a1a1a 100%);
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 500;
  border-bottom: 1px solid #646cff33;
}

.status-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #555;
  transition: all 0.3s ease;
}

.status-dot.ready {
  background: #41d1ff;
  box-shadow: 0 0 8px #41d1ff88;
}

.reload-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid #646cff44;
  background: #646cff22;
  color: #646cff;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.15s;
}

.reload-btn:hover {
  background: #646cff44;
  border-color: #646cff;
}

.status {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status.loading {
  background: #646cff22;
  color: #646cff;
  border: 1px solid #646cff44;
}

.status.ready {
  background: linear-gradient(135deg, #41d1ff22 0%, #bd34fe22 100%);
  color: #41d1ff;
  border: 1px solid #41d1ff44;
}

.preview-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #888;
  z-index: 5;
  gap: 16px;
}

.loading-overlay p {
  font-size: 14px;
  color: #646cff;
}

.loading-overlay::before {
  content: '';
  width: 40px;
  height: 40px;
  border: 3px solid #646cff33;
  border-top-color: #646cff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.preview-iframe-container {
  width: 100%;
  height: 100%;
}

.preview-iframe-container :deep(iframe) {
  width: 100%;
  height: 100%;
  border: none;
  background: #ffffff;
}
</style>
