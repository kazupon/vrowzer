import { describe, expect, test } from 'vitest'
import {
  isBuild,
  iframeInnerText,
  iframeTextContent,
  page,
  updateFile,
  waitForIframeSelector
} from '~utils'

describe('vue-basic', () => {
  test('page shows Ready status', async () => {
    const status = await page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('Vue SFC renders correctly', async () => {
    await waitForIframeSelector('h1')
    const text = await iframeInnerText()
    expect(text).toContain('Vrowzer + Vue')
    expect(text).toContain('count is')
  })

  test('Vue SFC HMR - template change', async () => {
    if (isBuild) {return}

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

    await page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.querySelector('button')?.textContent?.includes('clicks:')
      },
      { timeout: 10000 }
    )
  })
})
