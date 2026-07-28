import { describe, expect, test } from 'vite-plus/test'
import { isBuild, iframeInnerText, page, updateFile } from '~utils'

describe('vue-basic', () => {
  test('page shows Ready status', async () => {
    const status = await page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('Vue SFC renders correctly', async () => {
    await expect.poll(() => iframeInnerText(), { timeout: 30000 }).toContain('Vrowzer + Vue')
    await expect.poll(() => iframeInnerText(), { timeout: 30000 }).toContain('count is')
  })

  test('Vue SFC HMR - template change', async () => {
    if (isBuild) {
      return
    }

    await expect.poll(() => iframeInnerText(), { timeout: 30000 }).toContain('Vrowzer + Vue')

    await updateFile(
      '/HelloWorld.vue',
      `<script setup lang="ts">
import { ref } from 'vue'
defineProps<{ msg: string }>()
const count = ref(0)
</script>
<template>
  <h1>{{ msg }}</h1>
  <button type="button" @click="count++">clicks: {{ count }}</button>
</template>`
    )

    await expect.poll(() => iframeInnerText(), { timeout: 10000 }).toContain('clicks:')
  })
})
