import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  debug,
  isBuild,
  launchBrowser,
  startServer,
  waitForVrowserReady
} from '../../helpers/test-utils.ts'

import type { Browser, Page } from '@playwright/test'
import type { PreviewServer, ViteDevServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

let browser: Browser
let page: Page
let server: ViteDevServer | PreviewServer

beforeAll(async () => {
  browser = await launchBrowser()

  const result = await startServer(__dirname)
  server = result.server
  const serverUrl = result.serverUrl

  page = await browser.newPage()
  page.on('console', msg => debug(`[browser ${msg.type()}]`, msg.text()))
  page.on('pageerror', err => debug('[browser error]', err.message))

  await page.goto(serverUrl)
  await waitForVrowserReady(page)
}, 120000)

afterAll(async () => {
  await page?.close()
  await browser?.close()
  await server?.close()
})

describe('vue-basic', () => {
  test('page shows Ready status', async () => {
    const status = await page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('Vue SFC renders correctly', async () => {
    await page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.querySelector('h1')?.textContent?.includes('Vrowser + Vue')
      },
      { timeout: 30000 }
    )
    const text = await page.evaluate(() => {
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

    await page.evaluate(() => {
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

    await page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.querySelector('button')?.textContent?.includes('clicks:')
      },
      { timeout: 10000 }
    )
  })
})
