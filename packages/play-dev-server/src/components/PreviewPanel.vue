<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { getController, getServiceWorker } from '../sw/controller.ts'

import type { StateChangeInfo, SvcWorkerController } from '@vrowser/service-worker/controller'
import type { FileChangeMessage } from '../types.ts'

const props = defineProps<{
  code: string
}>()

const iframeRef = useTemplateRef('iframeRef')
const isServiceWorkerReady = ref(false)
const isPreviewReady = ref(false)
const error = ref<string | null>(null)

const PREVIEW_URL = '/preview/index.html'

// Event handler references for cleanup
let stateChangeHandler: ((info: StateChangeInfo) => void) | null = null
let controllerRef: SvcWorkerController | null = null

onMounted(() => {
  console.log('[Preview] Mounting...')

  const controller = getController()
  console.log('[Preview] Controller:', controller)
  console.log('[Preview] Controller state:', controller?.state)

  if (!controller) {
    error.value = 'Service Worker Controller not available'
    return
  }

  controllerRef = controller

  // Check if already activated
  if (controller.state === 'activated') {
    console.log('[Preview] Service Worker already activated')
    isServiceWorkerReady.value = true
    error.value = null

    // Load iframe (send initial code if available)
    loadIframe(props.code)
    return
  }

  // Listen for state changes via controller event
  stateChangeHandler = (info: StateChangeInfo) => {
    console.log('[Preview] Controller state changed:', info.state)
    if (info.state === 'activated') {
      console.log('[Preview] Service Worker is ready')
      isServiceWorkerReady.value = true
      error.value = null

      // Load iframe (send initial code if available)
      loadIframe(props.code)
    }
  }

  controller.on('changeState', stateChangeHandler)
})

onUnmounted(() => {
  if (controllerRef && stateChangeHandler) {
    controllerRef.off('changeState', stateChangeHandler)
  }
})

/**
 * Load iframe and optionally send initial code to Service Worker
 */
function loadIframe(code?: string) {
  // Send initial code if available
  if (code) {
    const serviceWorker = getServiceWorker()
    if (serviceWorker) {
      const message: FileChangeMessage = {
        type: 'file-change',
        path: '/__preview__/main.js',
        content: code
      }
      console.log('[Preview] Sending initial code to Service Worker')
      serviceWorker.postMessage(message)
    }
  }

  // Load iframe
  const iframe = iframeRef.value
  if (iframe) {
    console.log('[Preview] Loading iframe')
    iframe.src = PREVIEW_URL
    isPreviewReady.value = true
  }
}

/**
 * Send code change to Service Worker
 */
function sendCodeChange(code: string) {
  const serviceWorker = getServiceWorker()
  if (!serviceWorker) {
    console.warn('[Preview] No active Service Worker')
    return
  }

  const message: FileChangeMessage = {
    type: 'file-change',
    path: '/__preview__/main.js',
    content: code
  }

  console.log('[Preview] Sending file change to Service Worker')
  serviceWorker.postMessage(message)

  // Reload iframe to apply changes
  reloadIframe()
}

/**
 * Reload iframe
 */
function reloadIframe() {
  const iframe = iframeRef.value
  if (iframe) {
    // Small delay to ensure SW has processed the file
    setTimeout(() => {
      iframe.src = iframe.src
    }, 100)
  }
}

/**
 * Handle iframe load event
 */
function onIframeLoad() {
  console.log('[Preview] iframe loaded')
}

// Watch for code changes
watch(
  () => props.code,
  newCode => {
    if (isServiceWorkerReady.value) {
      sendCodeChange(newCode)
    }
  }
)
</script>

<template>
  <div class="preview-panel">
    <div class="preview-header">
      <span>Preview</span>
      <div class="status-container">
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
        @load="onIframeLoad"
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
