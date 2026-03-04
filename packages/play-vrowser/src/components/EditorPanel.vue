<script setup lang="ts">
import * as monaco from 'monaco-editor'
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import viteSvgRaw from '../../assets/vite.svg?raw'
import tsSvgRaw from '../../assets/typescript.svg?raw'

const emit = defineEmits<{
  (e: 'file-change', payload: { path: string; content: string }): void
}>()

const defaultMainTs = `import './style.css'
import viteLogo from './vite.svg'
import typescriptLogo from './typescript.svg'
import { setupCounter } from './counter.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = \`
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="\${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="\${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
\`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

if (import.meta.hot) {
  import.meta.hot.accept()
}
`

const defaultCounterTs = [
  'export function setupCounter(element: HTMLButtonElement) {',
  '  let counter = 0',
  '  const setCounter = (count: number) => {',
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

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}
a:hover {
  color: #535bf2;
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

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vanilla:hover {
  filter: drop-shadow(0 0 2em #3178c6aa);
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
    ['/main.ts', defaultMainTs],
    ['/counter.ts', defaultCounterTs],
    ['/style.css', defaultStyleCss],
    ['/vite.svg', viteSvgRaw],
    ['/typescript.svg', tsSvgRaw]
  ])
)
const activeFile = ref('/main.ts')

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
      // Update extra lib so other files see the latest content
      if (/\.[cm]?[jt]sx?$/.test(path)) {
        extraLibDisposables.get(path)?.dispose()
        extraLibDisposables.set(
          path,
          monaco.languages.typescript.typescriptDefaults.addExtraLib(value, `file://${path}`)
        )
      }
    })
    disposables.push(disposable)
    models.set(path, model)
  }
  return model
}

const extraLibDisposables = new Map<string, monaco.IDisposable>()

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

  // Configure TypeScript compiler options for Vite-like environment
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    allowImportingTsExtensions: true,
    allowJs: true,
    strict: true,
    noEmit: true,
  })

  // Add Vite-compatible type declarations for asset imports and import.meta
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    `declare module '*.svg' {
  const src: string
  export default src
}
declare module '*.png' {
  const src: string
  export default src
}
declare module '*.jpg' {
  const src: string
  export default src
}
declare module '*.css' {}

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  readonly BASE_URL: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly hot?: {
    accept(cb?: (mod: any) => void): void
    accept(deps: string[], cb: (mods: any[]) => void): void
    dispose(cb: (data: any) => void): void
    invalidate(): void
    readonly data: any
  }
}
`,
    'file:///vite-env.d.ts'
  )

  // Register all TS/JS files as extra libs so Monaco can resolve cross-file imports
  for (const [path, content] of files.value) {
    if (/\.[cm]?[jt]sx?$/.test(path)) {
      extraLibDisposables.set(
        path,
        monaco.languages.typescript.typescriptDefaults.addExtraLib(content, `file://${path}`)
      )
    }
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
