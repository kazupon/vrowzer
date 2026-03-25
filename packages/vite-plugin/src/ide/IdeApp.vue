<script setup lang="ts">
import { createBirpc } from 'birpc'
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import EditorPanel from './EditorPanel.vue'
import FileExplorer from './FileExplorer.vue'
import SplitPane from './SplitPane.vue'

import type { ClientFunctions, ServerFunctions } from './rpc'

const props = defineProps<{
  manifest: {
    name: string
    files: Record<string, string>
    nodeModules?: Record<string, string>
    activeFile?: string
  }
  basePath: string
  VrowzerFactory: (options?: { basePath?: string }) => any
  rpcPort: number
  devtoolsUrl?: string | null
}>()

const devtoolsOpen = ref(false)

const editorPanel = useTemplateRef<InstanceType<typeof EditorPanel>>('editorPanel')
const previewContainer = useTemplateRef<HTMLElement>('previewContainer')
const splitPane = useTemplateRef<InstanceType<typeof SplitPane>>('splitPane')
const isReady = ref(false)
const statusText = ref('Initializing...')
const syncStatus = ref('')

const vrowzer = props.VrowzerFactory({ basePath: props.basePath })

// --- birpc connection ---
let ws: WebSocket | null = null
let rpc: ReturnType<typeof createBirpc<ServerFunctions, ClientFunctions>> | null = null

function connectRpc() {
  ws = new WebSocket(`ws://localhost:${props.rpcPort}`)

  ws.onopen = () => {
    console.log('[Vrowzer IDE] RPC connected')

    rpc = createBirpc<ServerFunctions, ClientFunctions>(
      {
        // Server calls this when an external editor modifies a file
        onFileChanged(path: string, content: string) {
          console.log('[Vrowzer IDE] external file change:', path)
          // Update editor content if the file is open
          if (editorPanel.value?.editableFiles.has(path)) {
            editorPanel.value.editableFiles.set(path, content)
          }
          // Update vrowzer preview
          vrowzer.updateFile(path, content)
        }
      },
      {
        post: data => ws!.send(data),
        on: handler => {
          ws!.onmessage = e => handler(e.data)
        },
        serialize: v => JSON.stringify(v),
        deserialize: v => JSON.parse(v)
      }
    )
  }

  ws.onclose = () => {
    console.log('[Vrowzer IDE] RPC disconnected')
    rpc = null
  }
}

// --- lifecycle ---

vrowzer.on('reloadSuggested', (info: { reason: string }) => {
  window.alert(
    `Service Worker has been updated (reason: ${info.reason}).\nThe page will be reloaded.`
  )
  window.location.reload()
})

onMounted(async () => {
  await nextTick()
  splitPane.value?.setSizes([200, 500, 500])

  // Connect birpc
  connectRpc()

  const initialFiles: Record<string, string> = {}

  if (editorPanel.value) {
    for (const [path, content] of editorPanel.value.editableFiles) {
      initialFiles[path] = content
    }
  } else {
    Object.assign(initialFiles, props.manifest.files)
  }
  Object.assign(initialFiles, props.manifest.nodeModules ?? {})

  statusText.value = 'Starting preview...'
  const ready = await vrowzer.ready({ files: initialFiles })

  if (!ready) {
    statusText.value = 'Failed to initialize'
    return
  }

  if (previewContainer.value) {
    vrowzer.mount(previewContainer.value)
  }

  isReady.value = true
  statusText.value = 'Ready'
})

onUnmounted(() => {
  ws?.close()
})

// --- handlers ---

function handleFileChange({ path, content }: { path: string; content: string }) {
  // 1. Update preview via HMR (immediate)
  vrowzer.updateFile(path, content)

  // 2. Write back to local FS via birpc (async, no await)
  if (rpc) {
    rpc
      .writeFile(path, content)
      .then(() => {
        syncStatus.value = `Saved ${path.split('/').pop()}`
        setTimeout(() => {
          syncStatus.value = ''
        }, 2000)
      })
      .catch((err: Error) => {
        console.error('[Vrowzer IDE] writeFile failed:', err)
        syncStatus.value = 'Save failed'
      })
  }
}

function handleReload() {
  vrowzer.reloadPreview()
}

function handleFileSelect(path: string) {
  editorPanel.value?.selectFile(path)
}

const editorFiles = computed(() => editorPanel.value?.editableFiles ?? new Map<string, string>())
const editorActiveFile = computed(() => editorPanel.value?.currentFile ?? '')
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>Vrowzer IDE</h1>
      <span class="subtitle">experimental</span>
      <span class="project-name">{{ manifest.name }}</span>
      <div class="status-container">
        <span v-if="syncStatus" class="sync-status">{{ syncStatus }}</span>
        <button
          v-if="devtoolsUrl"
          :class="['devtools-btn', { active: devtoolsOpen }]"
          title="Toggle Vite DevTools"
          @click="devtoolsOpen = !devtoolsOpen"
        >
          DevTools
        </button>
      </div>
    </header>
    <main class="app-main">
      <div class="main-top" :style="{ flex: devtoolsOpen ? '0 0 60%' : '1' }">
        <SplitPane ref="splitPane" :sizes="[200, 500, 500]" :min-size="100">
          <template #panel-0>
            <FileExplorer
              :files="editorFiles"
              :active-file="editorActiveFile"
              @select="handleFileSelect"
            />
          </template>
          <template #panel-1>
            <EditorPanel
              ref="editorPanel"
              :files="manifest.files"
              :active-file="manifest.activeFile"
              @file-change="handleFileChange"
            />
          </template>
          <template #panel-2>
            <div class="preview-panel">
              <div class="preview-header">
                <span>Preview by MessageChannel base HMR</span>
                <div class="preview-status-container">
                  <button
                    v-if="isReady"
                    class="reload-btn"
                    title="Reload preview"
                    @click="handleReload"
                  >
                    Reload
                  </button>
                  <span :class="['status-dot', { ready: isReady }]" />
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
          </template>
        </SplitPane>
      </div>
      <div v-if="devtoolsOpen && devtoolsUrl" class="devtools-panel">
        <div class="devtools-header">
          <span>Vite DevTools</span>
          <button class="devtools-close" @click="devtoolsOpen = false">&#x2715;</button>
        </div>
        <iframe :src="devtoolsUrl" class="devtools-iframe" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
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

.project-name {
  font-size: 12px;
  color: #888888;
}

.status-container {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sync-status {
  font-size: 11px;
  color: #41d1ff;
  animation: fade-in 0.2s;
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

.app-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-top {
  overflow: hidden;
}

.devtools-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid #bd34fe44;
  background: #bd34fe22;
  color: #bd34fe;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.15s;
}

.devtools-btn:hover {
  background: #bd34fe44;
  border-color: #bd34fe;
}

.devtools-btn.active {
  background: #bd34fe;
  color: #fff;
  border-color: #bd34fe;
  box-shadow: 0 0 8px #bd34fe66;
}

.devtools-panel {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
  border-top: 1px solid #646cff33;
}

.devtools-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: linear-gradient(180deg, #242424 0%, #1a1a1a 100%);
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 500;
  border-bottom: 1px solid #646cff33;
}

.devtools-close {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
}

.devtools-close:hover {
  color: #fff;
}

.devtools-iframe {
  flex: 1;
  width: 100%;
  border: none;
  background: #fff;
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

.preview-status-container {
  display: flex;
  align-items: center;
  gap: 8px;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
