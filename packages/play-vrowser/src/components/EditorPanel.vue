<script setup lang="ts">
import * as monaco from 'monaco-editor'
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'

const emit = defineEmits<{
  (e: 'file-change', payload: { path: string; content: string }): void
}>()

const defaultMainJs = `import './style.css'
import { setupCounter } from './counter.js'

document.querySelector('#app').innerHTML = \`
  <div>
    <h1>Vite + JavaScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Edit files and see HMR in action
    </p>
  </div>
\`

setupCounter(document.querySelector('#counter'))

if (import.meta.hot) {
  import.meta.hot.accept()
}
`

const defaultCounterJs = [
  'export function setupCounter(element) {',
  '  let counter = 0',
  '  const setCounter = (count) => {',
  '    counter = count',
  '    element.innerHTML = `count is ${counter}`',
  '  }',
  "  element.addEventListener('click', () => setCounter(counter + 1))",
  '  setCounter(0)',
  '}',
  ''
].join('\n')

const defaultStyleCss = `:root {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

#app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
`

const files = ref<Map<string, string>>(
  new Map([
    ['/main.js', defaultMainJs],
    ['/counter.js', defaultCounterJs],
    ['/style.css', defaultStyleCss]
  ])
)
const activeFile = ref('/main.js')

defineExpose({ files })
const editorContainer = useTemplateRef('editorContainer')

let editor: monaco.editor.IStandaloneCodeEditor | null = null
const models = new Map<string, monaco.editor.ITextModel>()
const disposables: monaco.IDisposable[] = []

function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'javascript'
    case 'json':
      return 'json'
    case 'css':
      return 'css'
    case 'html':
      return 'html'
    default:
      return 'plaintext'
  }
}

function getOrCreateModel(path: string, content: string): monaco.editor.ITextModel {
  let model = models.get(path)
  if (!model || model.isDisposed()) {
    const uri = monaco.Uri.parse(`file://${path}`)
    model = monaco.editor.createModel(content, getLanguage(path), uri)
    const disposable = model.onDidChangeContent(() => {
      const value = model!.getValue()
      files.value.set(path, value)
      emit('file-change', { path, content: value })
    })
    disposables.push(disposable)
    models.set(path, model)
  }
  return model
}

function switchTab(path: string) {
  if (!editor || !files.value.has(path)) {
    return
  }
  activeFile.value = path
  const content = files.value.get(path)!
  const model = getOrCreateModel(path, content)
  editor.setModel(model)
  editor.focus()
}

function closeTab(path: string) {
  if (files.value.size <= 1) {
    return
  }
  files.value.delete(path)
  const model = models.get(path)
  if (model) {
    model.dispose()
    models.delete(path)
  }
  if (activeFile.value === path) {
    const first = files.value.keys().next().value as string
    switchTab(first)
  }
}

function addNewFile() {
  let name = prompt('File name (e.g. utils.ts):')
  if (!name) {
    return
  }
  name = name.trim()
  if (!name) {
    return
  }
  const path = name.startsWith('/') ? name : `/${name}`
  if (files.value.has(path)) {
    switchTab(path)
    return
  }
  files.value.set(path, '')
  switchTab(path)
  emit('file-change', { path, content: '' })
}

function filename(path: string): string {
  return path.split('/').pop() || path
}

onMounted(() => {
  if (!editorContainer.value) {
    return
  }

  editor = monaco.editor.create(editorContainer.value, {
    theme: 'vs-dark',
    fontSize: 14,
    fontFamily: "'Fira Code', 'JetBrains Mono', 'Consolas', 'Monaco', monospace",
    lineNumbers: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    tabSize: 2,
    automaticLayout: true,
    padding: { top: 12 }
  })

  const content = files.value.get(activeFile.value)!
  const model = getOrCreateModel(activeFile.value, content)
  editor.setModel(model)

  emit('file-change', { path: activeFile.value, content })
})

onUnmounted(() => {
  for (const d of disposables) {
    d.dispose()
  }
  disposables.length = 0
  for (const model of models.values()) {
    model.dispose()
  }
  models.clear()
  editor?.dispose()
  editor = null
})
</script>

<template>
  <div class="editor-panel">
    <div class="tab-bar">
      <div
        v-for="[path] in files"
        :key="path"
        class="tab"
        :class="{ active: path === activeFile }"
        @click="switchTab(path)"
      >
        <span class="tab-name">{{ filename(path) }}</span>
        <button v-if="files.size > 1" class="tab-close" @click.stop="closeTab(path)">×</button>
      </div>
      <button class="tab-add" @click="addNewFile" title="New file">+</button>
    </div>
    <div ref="editorContainer" class="editor-container" />
  </div>
</template>

<style scoped>
.editor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  border-right: 1px solid #2e2e2e;
}

.tab-bar {
  display: flex;
  align-items: center;
  background: #252526;
  border-bottom: 1px solid #1e1e1e;
  overflow-x: auto;
  min-height: 36px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  color: #969696;
  cursor: pointer;
  border-right: 1px solid #1e1e1e;
  white-space: nowrap;
  user-select: none;
  transition: background 0.15s;
}

.tab:hover {
  background: #2a2d2e;
}

.tab.active {
  background: #1e1e1e;
  color: #e0e0e0;
  border-bottom: 2px solid #646cff;
}

.tab-name {
  font-family: 'Fira Code', 'Consolas', monospace;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: #969696;
  font-size: 14px;
  cursor: pointer;
  border-radius: 3px;
  line-height: 1;
  padding: 0;
}

.tab-close:hover {
  background: #ff4d4f44;
  color: #ff4d4f;
}

.tab-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 0 4px;
  border: none;
  background: transparent;
  color: #969696;
  font-size: 18px;
  cursor: pointer;
  border-radius: 4px;
  padding: 0;
}

.tab-add:hover {
  background: #646cff33;
  color: #646cff;
}

.editor-container {
  flex: 1;
  overflow: hidden;
}
</style>
