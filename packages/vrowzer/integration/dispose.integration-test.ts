import { chromium } from '@playwright/test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, preview } from 'vite'
import { afterAll, beforeAll, describe, expect, test } from 'vite-plus/test'

import type { Browser, BrowserContext, Page } from '@playwright/test'
import type { PreviewServer } from 'vite'

// Disposing an instance leaves the Service Worker connected to a terminated Web Worker until
// another instance connects, so these tests use their own fixture, server and browser
// instead of the shared playground of vrowzer.integration-test.ts.
const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = join(__dirname, 'dispose')
const PREVIEW_TEXT = 'Dispose preview works'

let browser: Browser
let context: BrowserContext
let server: PreviewServer
let page: Page
const logs: string[] = []

function getServerOrigin(previewServer: PreviewServer): string {
  const address = previewServer.httpServer?.address()
  if (typeof address !== 'object' || !address) {
    throw new Error('Failed to get dispose integration server address')
  }
  return `http://localhost:${address.port}`
}

async function expectPreviewContent(): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const iframe = document.querySelector('#preview-container iframe') as HTMLIFrameElement
          return iframe?.contentDocument?.body?.innerText ?? ''
        }),
      { timeout: 15_000 }
    )
    .toContain(PREVIEW_TEXT)
}

beforeAll(async () => {
  await build({ root: FIXTURE_DIR, logLevel: 'silent' })
  server = await preview({
    root: FIXTURE_DIR,
    logLevel: 'silent',
    preview: { port: 0, strictPort: false }
  })
  browser = await chromium.launch({ headless: true })
  context = await browser.newContext()
  page = await context.newPage()
  page.on('console', message => logs.push(`[console:${message.type()}] ${message.text()}`))
  page.on('pageerror', error => logs.push(`[pageerror] ${error.message}`))

  await page.goto(`${getServerOrigin(server)}/`)
  await page.waitForFunction(() => document.body.dataset.fixtureReady === 'true')
}, 120_000)

afterAll(async () => {
  await context?.close()
  await browser?.close()
  await server?.close()
})

describe('Vrowzer dispose', () => {
  test('releases the Web Worker and previews of a ready instance', async () => {
    const started = await page.evaluate(async () => {
      const fixture = window as any
      const vrowzer = fixture.__createVrowzer__()
      fixture.__disposeTarget__ = vrowzer
      const ready = await vrowzer.ready({ files: fixture.__previewFiles__ })
      vrowzer.mount(document.getElementById('preview-container'), { id: 'preview' })
      return { ready, workers: fixture.__liveWorkerCount__() }
    })
    expect(started).toEqual({ ready: true, workers: 1 })
    await expectPreviewContent()
    // page.workers() also lists the Workers that the Web Worker starts itself (e.g. for the
    // rolldown WASM runtime), so the fixture counts Vrowzer's Web Worker on its own
    expect(page.workers().length).toBeGreaterThan(0)

    const disposed = await page.evaluate(async () => {
      const fixture = window as any
      const vrowzer = fixture.__disposeTarget__
      await vrowzer.dispose()

      const errors: Record<string, string> = {}
      try {
        await vrowzer.ready({ files: {} })
      } catch (error) {
        errors.ready = (error as Error).message
      }
      try {
        vrowzer.mount(document.getElementById('preview-container'), { id: 'again' })
      } catch (error) {
        errors.mount = (error as Error).message
      }
      try {
        await vrowzer.addFile('/added.js', '')
      } catch (error) {
        errors.addFile = (error as Error).message
      }
      delete fixture.__disposeTarget__

      return {
        workers: fixture.__liveWorkerCount__(),
        iframes: document.querySelectorAll('#preview-container iframe').length,
        sessions: vrowzer.sessions().length,
        errors
      }
    })

    expect(disposed).toEqual({
      workers: 0,
      iframes: 0,
      sessions: 0,
      errors: {
        ready: '[Vrowzer] ready() cannot be called after dispose()',
        mount: '[Vrowzer] mount() cannot be called after dispose()',
        addFile: '[Vrowzer] addFile() cannot be called after dispose()'
      }
    })
    await expect.poll(() => page.workers().length, { timeout: 10_000 }).toBe(0)
  }, 60_000)

  test('aborts ready() in progress', async () => {
    const result = await page.evaluate(async () => {
      const fixture = window as any
      const vrowzer = fixture.__createVrowzer__()
      const ready = vrowzer.ready({ files: fixture.__previewFiles__ })
      await vrowzer.dispose()
      return { ready: await ready, workers: fixture.__liveWorkerCount__() }
    })

    expect(result).toEqual({ ready: false, workers: 0 })
  }, 60_000)

  test('starts again with a new instance after dispose()', async () => {
    const started = await page.evaluate(async () => {
      const fixture = window as any
      const vrowzer = fixture.__createVrowzer__()
      const ready = await vrowzer.ready({ files: fixture.__previewFiles__ })
      vrowzer.mount(document.getElementById('preview-container'), { id: 'preview' })
      return { ready, workers: fixture.__liveWorkerCount__() }
    })

    expect(started).toEqual({ ready: true, workers: 1 })
    await expectPreviewContent()
  }, 60_000)

  test('reports no page errors', () => {
    expect(logs.join('\n')).not.toMatch(/\[pageerror\]/)
  })
})
