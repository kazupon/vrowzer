<script setup lang="ts">
import * as monaco from './monaco'
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'

const props = defineProps<{
  files: Record<string, string>
  activeFile?: string
}>()

const emit = defineEmits<{
  (e: 'file-change', payload: { path: string; content: string }): void
}>()

const editableFiles = ref<Map<string, string>>(new Map(Object.entries(props.files)))
const currentFile = ref(props.activeFile ?? Object.keys(props.files)[0] ?? '')

defineExpose({ editableFiles, currentFile, selectFile })
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
      editableFiles.value.set(path, value)
      emit('file-change', { path, content: value })
    })
    disposables.push(disposable)
    models.set(path, model)
  }
  return model
}

function selectFile(path: string) {
  if (!editor || !editableFiles.value.has(path)) return
  currentFile.value = path
  const content = editableFiles.value.get(path)!
  const model = getOrCreateModel(path, content)
  editor.setModel(model)
  editor.focus()
}

onMounted(() => {
  if (!editorContainer.value) return

  editor = monaco.editor.create(editorContainer.value, {
    theme: 'vs-dark',
    fontSize: 14,
    fontFamily: "'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
    lineNumbers: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    tabSize: 2,
    automaticLayout: true,
    padding: { top: 12 }
  })

  const content = editableFiles.value.get(currentFile.value)!
  const model = getOrCreateModel(currentFile.value, content)
  editor.setModel(model)
})

onUnmounted(() => {
  for (const d of disposables) d.dispose()
  disposables.length = 0
  for (const model of models.values()) model.dispose()
  models.clear()
  editor?.dispose()
  editor = null
})
</script>

<template>
  <div class="editor-panel">
    <div ref="editorContainer" class="editor-container" />
  </div>
</template>

<style scoped>
.editor-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #1e1e1e;
}
.editor-container {
  flex: 1;
  overflow: hidden;
}
</style>
