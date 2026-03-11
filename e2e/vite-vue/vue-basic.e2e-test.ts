import { describe, expect, test } from 'vitest'
import { setupHost } from '../helpers/setup.ts'
import { isBuild } from '../helpers/test-utils.ts'

const ctx = setupHost(import.meta.dirname)

describe('vue-basic', () => {
  test('page shows Ready status', async () => {
    const status = await ctx.page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('Vue SFC renders correctly', async () => {
    await ctx.page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.querySelector('h1')?.textContent?.includes('Vrowser + Vue')
      },
      { timeout: 30000 }
    )
    const text = await ctx.page.evaluate(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      return iframe?.contentDocument?.body?.innerText ?? ''
    })
    expect(text).toContain('Vrowser + Vue')
    expect(text).toContain('count is')
  })

  test('Vue SFC HMR - template change', async () => {
    if (isBuild) {
      return
    }

    await ctx.page.evaluate(() => {
      ;(window as any).__vrowser__.updateFile(
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
    })

    await ctx.page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.querySelector('button')?.textContent?.includes('clicks:')
      },
      { timeout: 10000 }
    )
  })
})
