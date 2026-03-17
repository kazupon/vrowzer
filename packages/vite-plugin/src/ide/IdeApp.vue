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
  VrowserFactory: (options?: { basePath?: string }) => any
  rpcPort: number
}>()

const editorPanel = useTemplateRef<InstanceType<typeof EditorPanel>>('editorPanel')
const previewContainer = useTemplateRef<HTMLElement>('previewContainer')
const splitPane = useTemplateRef<InstanceType<typeof SplitPane>>('splitPane')
const isReady = ref(false)
const statusText = ref('Initializing...')
const syncStatus = ref('')

const vrowser = props.VrowserFactory({ basePath: props.basePath })

// --- birpc connection ---
let ws: WebSocket | null = null
let rpc: ReturnType<typeof createBirpc<ServerFunctions, ClientFunctions>> | null = null

function connectRpc() {
  ws = new WebSocket(`ws://localhost:${props.rpcPort}`)

  ws.onopen = () => {
    console.log('[Vrowser IDE] RPC connected')

    rpc = createBirpc<ServerFunctions, ClientFunctions>(
      {
        // Server calls this when an external editor modifies a file
        onFileChanged(path: string, content: string) {
          console.log('[Vrowser IDE] external file change:', path)
          // Update editor content if the file is open
          if (editorPanel.value?.editableFiles.has(path)) {
            editorPanel.value.editableFiles.set(path, content)
          }
          // Update vrowser preview
          vrowser.updateFile(path, content)
        }
      },
      {
        post: data => ws!.send(data),
        on: handler => { ws!.onmessage = (e) => handler(e.data) },
        serialize: v => JSON.stringify(v),
        deserialize: v => JSON.parse(v)
      }
    )
  }

  ws.onclose = () => {
    console.log('[Vrowser IDE] RPC disconnected')
    rpc = null
  }
}

// --- lifecycle ---

vrowser.on('reloadSuggested', (info: { reason: string }) => {
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
  const ready = await vrowser.ready({ files: initialFiles })

  if (!ready) {
    statusText.value = 'Failed to initialize'
    return
  }

  if (previewContainer.value) {
    vrowser.mount(previewContainer.value)
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
  vrowser.updateFile(path, content)

  // 2. Write back to local FS via birpc (async, no await)
  if (rpc) {
    rpc.writeFile(path, content).then(() => {
      syncStatus.value = `Saved ${path.split('/').pop()}`
      setTimeout(() => { syncStatus.value = '' }, 2000)
    }).catch((err: Error) => {
      console.error('[Vrowser IDE] writeFile failed:', err)
      syncStatus.value = 'Save failed'
    })
  }
}

function handleReload() {
  vrowser.reloadPreview()
}

function handleFileSelect(path: string) {
  editorPanel.value?.switchTab(path)
}

const editorFiles = computed(() => editorPanel.value?.editableFiles ?? new Map<string, string>())
const editorActiveFile = computed(() => editorPanel.value?.currentFile ?? '')
</script>

<template>
  <div class="ide">
    <header class="ide-header">
      <span class="title">Vrowser IDE</span>
      <span class="badge">experimental</span>
      <span class="project-name">{{ manifest.name }}</span>
      <div class="status-area">
        <span v-if="syncStatus" class="sync-status">{{ syncStatus }}</span>
        <button v-if="isReady" class="reload-btn" @click="handleReload">Reload</button>
        <span :class="['status-dot', { ready: isReady }]" />
        <span :class="['status-text', isReady ? 'ready' : 'loading']">{{ statusText }}</span>
      </div>
    </header>
    <main class="ide-main">
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
            <div v-if="!isReady" class="loading-overlay">
              <div class="spinner" />
              <p>{{ statusText }}</p>
            </div>
            <div ref="previewContainer" class="preview-container" />
          </div>
        </template>
      </SplitPane>
    </main>
  </div>
</template>

<style scoped>
.ide { display: flex; flex-direction: column; height: 100vh; background: #1a1a1a; color: #ccc; }
.ide-header { display: flex; align-items: center; gap: 12px; padding: 8px 16px; background: #1e1e1e; border-bottom: 1px solid #333; font-size: 13px; }
.title { font-weight: 600; color: #fff; }
.badge { background: #4a3; color: #fff; padding: 1px 6px; border-radius: 3px; font-size: 11px; }
.project-name { color: #888; font-size: 12px; }
.status-area { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.sync-status { font-size: 11px; color: #4a3; animation: fade-in 0.2s; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #555; }
.status-dot.ready { background: #41d1ff; box-shadow: 0 0 8px #41d1ff88; }
.status-text { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.status-text.loading { color: #646cff; }
.status-text.ready { color: #41d1ff; }
.reload-btn { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 12px; border: 1px solid #646cff44; background: #646cff22; color: #646cff; cursor: pointer; }
.reload-btn:hover { background: #646cff44; border-color: #646cff; }
.ide-main { flex: 1; overflow: hidden; }
.preview-panel { width: 100%; height: 100%; position: relative; background: #fff; }
.preview-container { width: 100%; height: 100%; }
.preview-container :deep(iframe) { width: 100%; height: 100%; border: none; }
.loading-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #1a1a2e; z-index: 5; gap: 16px; }
.loading-overlay p { font-size: 14px; color: #646cff; }
.spinner { width: 40px; height: 40px; border: 3px solid #646cff33; border-top-color: #646cff; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
</style>
