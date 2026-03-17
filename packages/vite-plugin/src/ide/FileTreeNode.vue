<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref } from 'vue'

import iconTs from '@iconify-icons/vscode-icons/file-type-typescript'
import iconJs from '@iconify-icons/vscode-icons/file-type-js'
import iconVue from '@iconify-icons/vscode-icons/file-type-vue'
import iconSvelte from '@iconify-icons/vscode-icons/file-type-svelte'
import iconCss from '@iconify-icons/vscode-icons/file-type-css'
import iconHtml from '@iconify-icons/vscode-icons/file-type-html'
import iconJson from '@iconify-icons/vscode-icons/file-type-json'
import iconYaml from '@iconify-icons/vscode-icons/file-type-yaml'
import iconSvg from '@iconify-icons/vscode-icons/file-type-svg'
import iconImage from '@iconify-icons/vscode-icons/file-type-image'
import iconDefault from '@iconify-icons/vscode-icons/default-file'
import iconFolderOpen from '@iconify-icons/vscode-icons/default-folder-opened'
import iconFolder from '@iconify-icons/vscode-icons/default-folder'

import type { IconifyIcon } from '@iconify/vue'

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

const FILE_ICONS: Record<string, IconifyIcon> = {
  ts: iconTs,
  tsx: iconTs,
  js: iconJs,
  jsx: iconJs,
  mjs: iconJs,
  vue: iconVue,
  svelte: iconSvelte,
  css: iconCss,
  html: iconHtml,
  json: iconJson,
  yaml: iconYaml,
  yml: iconYaml,
  svg: iconSvg,
  png: iconImage,
  jpg: iconImage,
  jpeg: iconImage,
  gif: iconImage,
  webp: iconImage
}

function getFileIcon(name: string): IconifyIcon {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return FILE_ICONS[ext] ?? iconDefault
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
      <Icon :icon="expanded ? iconFolderOpen : iconFolder" :width="16" />
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
    <Icon :icon="getFileIcon(node.name)" :width="16" />
    <span>{{ node.name }}</span>
  </div>
</template>

<style scoped>
.tree-item { display: flex; align-items: center; gap: 4px; padding: 3px 8px; font-size: 13px; color: #cccccc; cursor: pointer; user-select: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tree-item .chevron { font-size: 10px; width: 14px; flex-shrink: 0; text-align: center; color: #888888; }
.tree-item.dir { color: #bbbbbb; font-weight: 500; }
.tree-item.dir:hover, .tree-item.file:hover { background: #2a2d2e; }
.tree-item.file.active { background: #37373d; color: #ffffff; }
</style>
