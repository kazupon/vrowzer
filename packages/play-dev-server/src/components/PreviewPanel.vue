<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { getController } from '../sw/controller.ts'

import type { StateChangeInfo, SvcWorkerController } from '@vrowser/service-worker/controller'

const iframeRef = useTemplateRef('iframeRef')
const isServiceWorkerReady = ref(false)
const isPreviewReady = ref(false)
const error = ref<string | null>(null)

const PREVIEW_URL = '/__preview__/'

let stateChangeHandler: ((info: StateChangeInfo) => void) | null = null
let controllerRef: SvcWorkerController | null = null

onMounted(() => {
  const controller = getController()
  if (!controller) {
    error.value = 'Service Worker Controller not available'
    return
  }

  controllerRef = controller

  if (controller.state === 'activated') {
    isServiceWorkerReady.value = true
    error.value = null
    loadIframe()
    return
  }

  stateChangeHandler = (info: StateChangeInfo) => {
    if (info.state === 'activated') {
      isServiceWorkerReady.value = true
      error.value = null
      loadIframe()
    }
  }

  controller.on('changeState', stateChangeHandler)
})

onUnmounted(() => {
  if (controllerRef && stateChangeHandler) {
    controllerRef.off('changeState', stateChangeHandler)
  }
})

async function loadIframe() {
  // Wait for SW to become the controller (after clients.claim() completes).
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>(resolve => {
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
    })
  }

  const iframe = iframeRef.value
  if (!iframe) {
    return
  }

  // credentialless iframes don't use SW for navigation requests (setting src),
  // but fetch() inside the iframe DOES go through the SW.
  // So we use a srcdoc bootstrap that fetches the preview HTML via fetch()
  // and writes it to the document.
  const bootstrapHtml = `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
(async () => {
  try {
    const res = await fetch('${PREVIEW_URL}');
    const html = await res.text();
    document.open();
    document.write(html);
    document.close();
  } catch (e) {
    document.body.textContent = 'Preview load error: ' + e.message;
  }
})();
<\/script>
</body>
</html>`

  iframe.srcdoc = bootstrapHtml
  isPreviewReady.value = true
}

function reload() {
  if (isServiceWorkerReady.value) {
    loadIframe()
  }
}

defineExpose({ reload })
</script>

<template>
  <div class="preview-panel">
    <div class="preview-header">
      <span>Preview</span>
      <div class="status-container">
        <button
          v-if="isServiceWorkerReady"
          class="reload-btn"
          title="Reload preview"
          @click="reload"
        >
          Reload
        </button>
        <span
          :class="['status-dot', { ready: isServiceWorkerReady }]"
          title="Service Worker"
        ></span>
        <span v-if="error" class="status error">Error</span>
        <span v-else-if="isServiceWorkerReady" class="status ready">Ready</span>
        <span v-else class="status loading">Loading...</span>
      </div>
    </div>
    <div class="preview-content">
      <div v-if="error" class="error-overlay">
        <pre>{{ error }}</pre>
      </div>
      <div v-if="!isPreviewReady" class="loading-overlay">
        <p>Waiting for Service Worker...</p>
      </div>
      <iframe
        ref="iframeRef"
        class="preview-iframe"
        sandbox="allow-scripts allow-same-origin"
        credentialless
      ></iframe>
    </div>
  </div>
</template>

<style scoped>
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

.status.error {
  background: #ff4d4f22;
  color: #ff4d4f;
  border: 1px solid #ff4d4f44;
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

.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border-bottom: 2px solid #ff4d4f;
  padding: 12px 16px;
  z-index: 10;
  max-height: 200px;
  overflow: auto;
}

.error-overlay pre {
  margin: 0;
  font-size: 12px;
  color: #ff4d4f;
  font-family: 'Fira Code', monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #ffffff;
}
</style>
