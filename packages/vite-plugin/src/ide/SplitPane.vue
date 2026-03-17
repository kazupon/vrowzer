<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

withDefaults(
  defineProps<{
    sizes?: number[]
    minSize?: number
  }>(),
  {
    sizes: () => [],
    minSize: 50
  }
)

const container = useTemplateRef<HTMLElement>('container')
const panelSizes = ref<number[]>([])
let activeGrip = -1

function initSizes() {
  if (!container.value) return
  const total = container.value.offsetWidth
  const props = { sizes: panelSizes.value.length ? panelSizes.value : [] }
  if (props.sizes.length === 0) return
  const sum = props.sizes.reduce((a, b) => a + b, 0)
  panelSizes.value = props.sizes.map(s => (s / sum) * total)
}

function setSizes(sizes: number[]) {
  if (!container.value) return
  const total = container.value.offsetWidth
  const sum = sizes.reduce((a, b) => a + b, 0)
  panelSizes.value = sizes.map(s => (s / sum) * total)
}

function onGripDown(index: number, e: MouseEvent) {
  e.preventDefault()
  activeGrip = index
  const startX = e.clientX
  const startLeft = panelSizes.value[index]!
  const startRight = panelSizes.value[index + 1]!
  const minSize = 50

  function onMove(e: MouseEvent) {
    const delta = e.clientX - startX
    const newLeft = startLeft + delta
    const newRight = startRight - delta
    if (newLeft < minSize || newRight < minSize) return
    panelSizes.value[index] = newLeft
    panelSizes.value[index + 1] = newRight
  }

  function onUp() {
    activeGrip = -1
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

defineExpose({ initSizes, setSizes })
</script>

<template>
  <div ref="container" class="split-pane">
    <template v-for="(size, i) in panelSizes" :key="i">
      <div class="split-panel" :style="{ width: size + 'px' }">
        <slot :name="'panel-' + i" />
      </div>
      <div
        v-if="i < panelSizes.length - 1"
        class="split-grip"
        :class="{ active: activeGrip === i }"
        @mousedown="onGripDown(i, $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.split-pane { display: flex; width: 100%; height: 100%; overflow: hidden; }
.split-panel { height: 100%; overflow: hidden; flex-shrink: 0; }
.split-grip { width: 4px; flex-shrink: 0; cursor: col-resize; background: #1e1e1e; transition: background 0.15s; position: relative; }
.split-grip::after { content: ''; position: absolute; top: 0; left: -2px; right: -2px; bottom: 0; }
.split-grip:hover, .split-grip.active { background: #646cff; }
</style>
