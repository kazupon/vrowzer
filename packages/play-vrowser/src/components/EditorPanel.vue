<script setup lang="ts">
import * as monaco from 'monaco-editor'
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'

import type { VrowserManifest } from '../../fixtures/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- monaco.languages.typescript is marked as deprecated in types but still works at runtime
const ts = (monaco.languages as any).typescript

const props = defineProps<{ manifest: VrowserManifest }>()

const emit = defineEmits<{
  (e: 'file-change', payload: { path: string; content: string }): void
}>()

const files = ref<Map<string, string>>(new Map(Object.entries(props.manifest.files)))
const hiddenFiles = {
  ...(props.manifest.vendor ?? {}),
  ...(props.manifest.nodeModules ?? {})
}
const activeFile = ref(props.manifest.activeFile ?? Object.keys(props.manifest.files)[0] ?? '')

defineExpose({ files, hiddenFiles, activeFile, switchTab })
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
    case 'yaml':
    case 'yml':
      return 'yaml'
    case 'vue':
    case 'svelte':
      return 'html'
    case 'svg':
      return 'xml'
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
        extraLibDisposables.set(path, ts.typescriptDefaults.addExtraLib(value, `file://${path}`))
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
  ts.typescriptDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    jsx: ts.JsxEmit.ReactJSX,
    jsxImportSource: 'react',
    allowNonTsExtensions: true,
    allowImportingTsExtensions: true,
    allowJs: true,
    strict: true,
    noEmit: true
  })

  // Add Vite-compatible type declarations for asset imports and import.meta
  ts.typescriptDefaults.addExtraLib(
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
declare module '*.yaml' {
  const data: any
  export default data
}
declare module '*.yml' {
  const data: any
  export default data
}
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

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

declare module 'react' {
  export function useState<S>(initialState: S | (() => S)): [S, (value: S | ((prev: S) => S)) => void]
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T
  export function useRef<T>(initialValue: T): { current: T }
  export function useContext<T>(context: any): T
  export function useReducer<S, A>(reducer: (state: S, action: A) => S, initialState: S): [S, (action: A) => void]
  export function useId(): string
  export function createElement(type: any, props?: any, ...children: any[]): any
  export function createContext<T>(defaultValue: T): any
  export function forwardRef<T, P = {}>(render: (props: P, ref: any) => any): any
  export function memo<T extends (props: any) => any>(component: T): T
  export function lazy<T extends (props: any) => any>(factory: () => Promise<{ default: T }>): T
  export const Fragment: any
  export const StrictMode: any
  export const Suspense: any
  export const version: string
  export default {} as any
}
declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): {
    render(element: any): void
    unmount(): void
  }
  export function hydrateRoot(container: Element | DocumentFragment, initialChildren: any): any
}
declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: string): any
  export function jsxs(type: any, props: any, key?: string): any
  export const Fragment: any
}
declare module 'react/jsx-dev-runtime' {
  export function jsxDEV(type: any, props: any, key?: string, isStaticChildren?: boolean, source?: any, self?: any): any
  export const Fragment: any
}
declare namespace JSX {
  type Element = any
  interface IntrinsicElements {
    [elemName: string]: any
  }
}
`,
    'file:///vite-env.d.ts'
  )

  // Register all TS/JS files as extra libs so Monaco can resolve cross-file imports
  for (const [path, content] of files.value) {
    if (/\.[cm]?[jt]sx?$/.test(path)) {
      extraLibDisposables.set(path, ts.typescriptDefaults.addExtraLib(content, `file://${path}`))
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
