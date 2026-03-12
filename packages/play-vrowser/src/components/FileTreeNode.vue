<script setup lang="ts">
import { ref } from 'vue'

export interface TreeNode {
  name: string
  path: string
  isDir: boolean
  children: TreeNode[]
}

const props = defineProps<{
  node: TreeNode
  activeFile: string
  depth: number
}>()

const emit = defineEmits<{
  (e: 'select', path: string): void
}>()

const expanded = ref(true)

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
  <div v-if="node.isDir">
    <div
      class="tree-item dir"
      :style="{ paddingLeft: depth * 16 + 8 + 'px' }"
      @click="expanded = !expanded"
    >
      <span class="chevron">{{ expanded ? '▾' : '▸' }}</span>
      <span class="icon">{{ expanded ? '📂' : '📁' }}</span>
      <span>{{ node.name }}</span>
    </div>
    <div v-show="expanded">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :active-file="activeFile"
        :depth="depth + 1"
        @select="emit('select', $event)"
      />
    </div>
  </div>
  <div
    v-else
    class="tree-item file"
    :class="{ active: node.path === activeFile }"
    :style="{ paddingLeft: depth * 16 + 8 + 'px' }"
    @click="emit('select', node.path)"
  >
    <span class="chevron" />
    <span class="icon">{{ getFileIcon(node.name) }}</span>
    <span>{{ node.name }}</span>
  </div>
</template>

<style scoped>
.tree-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 13px;
  color: #cccccc;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-item .chevron {
  font-size: 10px;
  width: 14px;
  flex-shrink: 0;
  text-align: center;
  color: #888888;
}

.tree-item .icon {
  font-size: 14px;
  flex-shrink: 0;
  width: 18px;
  text-align: center;
}

.tree-item.dir {
  color: #bbbbbb;
  font-weight: 500;
}

.tree-item.dir:hover {
  background: #2a2d2e;
}

.tree-item.file:hover {
  background: #2a2d2e;
}

.tree-item.file.active {
  background: #37373d;
  color: #ffffff;
}
</style>
