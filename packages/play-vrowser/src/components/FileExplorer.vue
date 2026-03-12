<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  files: Map<string, string>
  activeFile: string
}>()

const emit = defineEmits<{
  (e: 'select', path: string): void
}>()

interface TreeNode {
  name: string
  path: string
  isDir: boolean
  children: TreeNode[]
}

const fileTree = computed<TreeNode[]>(() => {
  const root: TreeNode[] = []

  for (const [path] of props.files) {
    const parts = path.replace(/^\//, '').split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]!
      const isLast = i === parts.length - 1
      const nodePath = '/' + parts.slice(0, i + 1).join('/')

      let node = current.find(n => n.name === name)
      if (!node) {
        node = { name, path: nodePath, isDir: !isLast, children: [] }
        current.push(node)
      }
      current = node.children
    }
  }

  sortTree(root)
  return root
})

function sortTree(nodes: TreeNode[]) {
  nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  for (const node of nodes) {
    if (node.children.length > 0) sortTree(node.children)
  }
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return '🔷'
    case 'js':
    case 'jsx':
    case 'mjs':
      return '🟡'
    case 'vue':
      return '💚'
    case 'svelte':
      return '🧡'
    case 'css':
      return '🎨'
    case 'html':
      return '🌐'
    case 'json':
      return '📋'
    case 'yaml':
    case 'yml':
      return '📄'
    case 'svg':
      return '🖼️'
    default:
      return '📄'
  }
}
</script>

<template>
  <div class="file-explorer">
    <div class="explorer-header">
      <span class="icon">📁</span>
      <span>Explorer</span>
    </div>
    <div class="explorer-tree">
      <template v-for="node in fileTree" :key="node.path">
        <div v-if="node.isDir" class="tree-item dir">
          <span class="icon">📂</span>
          <span>{{ node.name }}</span>
        </div>
        <template v-if="node.isDir">
          <div
            v-for="child in node.children"
            :key="child.path"
            class="tree-item file nested"
            :class="{ active: child.path === activeFile }"
            @click="emit('select', child.path)"
          >
            <span class="icon">{{ getFileIcon(child.name) }}</span>
            <span>{{ child.name }}</span>
          </div>
        </template>
        <div
          v-else
          class="tree-item file"
          :class="{ active: node.path === activeFile }"
          @click="emit('select', node.path)"
        >
          <span class="icon">{{ getFileIcon(node.name) }}</span>
          <span>{{ node.name }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.file-explorer {
  display: flex;
  flex-direction: column;
  width: 200px;
  min-width: 200px;
  background: #252526;
  border-right: 1px solid #1e1e1e;
  overflow-y: auto;
}

.explorer-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #bbbbbb;
  border-bottom: 1px solid #1e1e1e;
  user-select: none;
}

.explorer-tree {
  padding: 4px 0;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-size: 13px;
  color: #cccccc;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-item .icon {
  font-size: 14px;
  flex-shrink: 0;
  width: 18px;
  text-align: center;
}

.tree-item.nested {
  padding-left: 28px;
}

.tree-item.dir {
  color: #bbbbbb;
  font-weight: 500;
  cursor: default;
}

.tree-item.file:hover {
  background: #2a2d2e;
}

.tree-item.file.active {
  background: #37373d;
  color: #ffffff;
}
</style>
