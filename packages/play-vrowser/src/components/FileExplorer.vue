<script setup lang="ts">
import { Icon } from '@iconify/vue'
import iconFolderOpen from '@iconify-icons/vscode-icons/default-folder-opened'
import { computed } from 'vue'
import FileTreeNode from './FileTreeNode.vue'

import type { TreeNode } from './FileTreeNode.vue'

const props = defineProps<{
  files: Map<string, string>
  activeFile: string
}>()

const emit = defineEmits<{
  (e: 'select', path: string): void
}>()

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
</script>

<template>
  <div class="file-explorer">
    <div class="explorer-header">
      <Icon :icon="iconFolderOpen" :width="16" />
      <span>Explorer</span>
    </div>
    <div class="explorer-tree">
      <FileTreeNode
        v-for="node in fileTree"
        :key="node.path"
        :node="node"
        :active-file="activeFile"
        :depth="0"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.file-explorer {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #252526;
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
</style>
