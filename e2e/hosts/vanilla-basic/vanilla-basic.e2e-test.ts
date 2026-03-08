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

describe('vanilla-basic', () => {
  test('page shows Ready status', async () => {
    const status = await page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('preview iframe renders content', async () => {
    await page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.body?.innerText?.includes('count is')
      },
      { timeout: 30000 }
    )
    const text = await page.evaluate(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      return iframe?.contentDocument?.body?.innerText ?? ''
    })
    expect(text).toContain('count is')
  })

  test('preview iframe shows YAML data', async () => {
    const text = await page.evaluate(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      return iframe?.contentDocument?.body?.innerText ?? ''
    })
    expect(text).toContain('Hello from YAML')
  })

  test('HMR - update file changes preview', async () => {
    if (isBuild) {
      return
    }

    await page.evaluate(() => {
      ;(window as any).__vrowser__.updateFile(
        '/main.ts',
        `
document.querySelector('#app')!.innerHTML = '<h1>HMR Updated</h1>'
if (import.meta.hot) { import.meta.hot.accept() }
`
      )
    })

    await page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.querySelector('h1')?.textContent === 'HMR Updated'
      },
      { timeout: 10000 }
    )
  })
})
