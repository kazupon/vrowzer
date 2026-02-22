<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue'
import EditorPanel from './components/EditorPanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import { getServiceWorker, initServiceWorker } from './sw/controller.ts'

import type {
  BundleRequestMessage,
  FileChangeMessage,
  ServiceWorkerToMainMessage,
  WorkerToMainMessage
} from './types.ts'

const previewBase = '/__preview__/'

let rolldownWorker: Worker | null = null
const editorPanel = useTemplateRef<InstanceType<typeof EditorPanel>>('editorPanel')
const previewPanel = useTemplateRef<InstanceType<typeof PreviewPanel>>('previewPanel')

onMounted(async () => {
  // Create Web Worker
  rolldownWorker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module'
  })

  // Set up message handler for web worker responses
  rolldownWorker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
    if (event.data.type === 'bundle-result') {
      const { success, code, fileName, error } = event.data
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

  // web worker  ready promise: send V_WW_SETUP and wait for V_WW_SETUP_ACK
  const webWorkerReady = new Promise<void>(resolve => {
    const prevHandler = rolldownWorker!.onmessage
    rolldownWorker!.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
      if (event.data.type === 'V_WW_SETUP_ACK') {
        console.log('[App] WW setup complete')
        rolldownWorker!.onmessage = prevHandler
        resolve()
        return
      }
      // Forward other messages to the previous handler
      prevHandler?.call(rolldownWorker!, event)
    }
  })

  // Collect initial files from EditorPanel to sync with Web Worker's virtual FS
  const initialFiles: Record<string, string> = {}
  if (editorPanel.value?.files) {
    for (const [path, content] of editorPanel.value.files) {
      initialFiles[path] = content
    }
  }

  // Import dist client files
  const { default: client } = await import('@vrowser/vite-dev-server/dist/client/client.mjs?raw')
  initialFiles['/dist/client/client.mjs'] = client
  const { default: env } = await import('@vrowser/vite-dev-server/dist/client/env.mjs?raw')
  initialFiles['/dist/client/env.mjs'] = env

  console.log('[App] Sending V_WW_SETUP to worker...')
  rolldownWorker.postMessage({
    type: 'V_WW_SETUP',
    config: {
      root: '/',
      base: previewBase,
      publicDir: 'public',
      optimizeDeps: { disabled: true },
      experimental: {
        importGlobRestoreExtension: false,
        // NOTE: renderBuiltUrl is a function and cannot be cloned via postMessage.
        // It will be set to the default value in the worker's setupWorker().
        // renderBuiltUrl: () => undefined,
        hmrPartialAccept: false,
        enableNativePlugin: 'v2',
        bundledDev: false
      }
    },
    options: { basePath: previewBase },
    files: initialFiles
  })

  // Initialize service worker and web worker  in parallel
  const [serviceWorkerController] = await Promise.all([
    initServiceWorker()
      .then(controller => {
        console.log('[App] SW ready:', controller.state)
        return controller
      })
      .catch(error => {
        console.error('[App] SW init failed:', error)
        return null
      }),
    webWorkerReady
  ])

  // Both ready — establish MessageChannel between service worker and web worker
  if (serviceWorkerController) {
    await establishChannel()
    // Load preview iframe after birpc channel is established
    // so that transformIndexHtml can delegate to WW
    previewPanel.value?.loadIframe()
  }

  // Test bundle after setup
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

/**
 * Establish MessageChannel between service worker and web worker .
 * Creates a MessageChannel, sends one port to each side,
 * and waits for both ACKs (handshake + birpc ready).
 */
async function establishChannel() {
  const serviceWorker = getServiceWorker()
  if (!serviceWorker || !rolldownWorker) {
    console.error('[App] Cannot establish channel: missing SW or WW')
    return
  }

  const channel = new MessageChannel()

  // Wait for service worker's ACK (via navigator.serviceWorker message)
  const serviceWorkerAck = new Promise<void>(resolve => {
    const handler = (event: MessageEvent<ServiceWorkerToMainMessage>) => {
      if (event.data?.type === 'V_WW_CONNECT_PORT_ACK') {
        navigator.serviceWorker.removeEventListener('message', handler)
        resolve()
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
  })

  // Wait for web worker 's ACK (via worker.onmessage)
  const webWorkerAck = new Promise<void>(resolve => {
    const prevHandler = rolldownWorker!.onmessage
    rolldownWorker!.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
      if (event.data.type === 'V_SW_CONNECT_PORT_ACK') {
        rolldownWorker!.onmessage = prevHandler
        resolve()
        return
      }
      prevHandler?.call(rolldownWorker!, event)
    }
  })

  // Transfer ports
  serviceWorker.postMessage({ type: 'V_WW_CONNECT_PORT' }, [channel.port1])
  rolldownWorker.postMessage({ type: 'V_SW_CONNECT_PORT' }, [channel.port2])

  // Wait for both sides to complete handshake + birpc setup
  await Promise.all([serviceWorkerAck, webWorkerAck])
  console.log('[App] SW<->WW MessageChannel fully established')
}

function handleFileChange({ path, content }: { path: string; content: string }) {
  const message: FileChangeMessage = {
    type: 'file-change',
    path,
    content
  }
  // Send to both Service Worker and Web Worker
  getServiceWorker()?.postMessage(message)
  rolldownWorker?.postMessage(message)
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>play-dev-server</h1>
      <span class="subtitle">@vrowser/vite-dev-server playground</span>
    </header>
    <main class="app-main">
      <EditorPanel ref="editorPanel" @file-change="handleFileChange" />
      <PreviewPanel ref="previewPanel" />
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
