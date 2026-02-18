<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import EditorPanel from './components/EditorPanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import { getServiceWorker } from './sw/controller.ts'

import type { BundleRequestMessage, BundleResultMessage, FileChangeMessage } from './types.ts'

let rolldownWorker: Worker | null = null

onMounted(() => {
  // Initialize Rolldown Web Worker
  rolldownWorker = new Worker(new URL('./worker/rolldown.worker.ts', import.meta.url), {
    type: 'module'
  })

  rolldownWorker.onmessage = (event: MessageEvent<BundleResultMessage>) => {
    const { type, success, code, fileName, error } = event.data
    if (type === 'bundle-result') {
      if (success) {
        console.log('[App] Bundle success:', fileName, code?.slice(0, 100) + '...')
      } else {
        console.error('[App] Bundle failed:', error)
      }
    }
  }

  rolldownWorker.onerror = error => {
    console.error('[App] Rolldown Worker error:', error)
  }

  // Test bundle on worker initialization
  const testMessage: BundleRequestMessage = {
    type: 'bundle',
    files: {
      '/src/index.js': 'import { add } from "./math.js"\nconsole.log(add(1, 2))',
      '/src/math.js': 'export function add(a, b) { return a + b }'
    },
    input: '/src/index.js'
  }
  rolldownWorker.postMessage(testMessage)
})

onUnmounted(() => {
  rolldownWorker?.terminate()
  rolldownWorker = null
})

function handleFileChange({ path, content }: { path: string; content: string }) {
  const serviceWorker = getServiceWorker()
  const message: FileChangeMessage = {
    type: 'file-change',
    path,
    content
  }
  serviceWorker?.postMessage(message)
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>play-dev-server</h1>
      <span class="subtitle">@vrowser/vite-dev-server playground</span>
    </header>
    <main class="app-main">
      <EditorPanel @file-change="handleFileChange" />
      <PreviewPanel />
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
  gap: 16px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-bottom: 1px solid #646cff33;
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
</style>
