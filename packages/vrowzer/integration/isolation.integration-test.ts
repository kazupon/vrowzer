import { chromium } from '@playwright/test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, preview } from 'vite'
import { afterAll, beforeAll, describe, expect, test } from 'vite-plus/test'

import type { Browser, BrowserContext, Page } from '@playwright/test'
import type { PreviewServer } from 'vite'

// Pages in one browser context share the Service Worker registration, as tabs do. These tests open
// two of them in a new context for each test. They use the fixture of
// restart.integration-test.ts, which creates Vrowzer instances with any files, and holds the load
// of /held.js in the Web Worker until /held-release is written.
const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = join(__dirname, 'restart')
const PIXEL_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]

let browser: Browser
let server: PreviewServer
let origin: string

interface Tab {
  page: Page
  previewBasePath: string
}

interface PreviewResponse {
  status: number
  body: string
}

/**
 * The project of a tab: the same paths in every tab, with contents that name the tab.
 */
function projectOf(name: string): Record<string, string> {
  return {
    '/index.html': `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Project ${name}</title></head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
    '/held.js': `export const held = ${JSON.stringify(name)}`,
    '/data.txt': `data of ${name}`
  }
}

/**
 * Opens a page in `context`, and mounts a preview of a ready Vrowzer instance whose `/src/main.ts`
 * renders `text`.
 */
async function openTab(context: BrowserContext, name: string, text = `main ${name}`): Promise<Tab> {
  const page = await context.newPage()
  await page.goto(`${origin}/`)
  await page.waitForFunction(() => document.body.dataset.fixtureReady === 'true')
  const previewBasePath = await page.evaluate(
    async ({ files, text }) => {
      const fixture = window as any
      const vrowzer = fixture.__createVrowzer__()
      fixture.__vrowzer__ = vrowzer
      const ready = await vrowzer.ready({
        files: {
          ...fixture.__previewFiles__,
          ...files,
          '/src/main.ts': fixture.__mainSource__(text)
        }
      })
      if (!ready) {
        throw new Error('ready() failed')
      }
      vrowzer.mount(document.getElementById('preview-container'), { id: 'preview' })
      return vrowzer.previewBasePath as string
    },
    { files: projectOf(name), text }
  )
  await expectPreviewText(page, text)
  return { page, previewBasePath }
}

/**
 * Reads a file of the tab's project through the Service Worker, from the host page of `from`. A
 * narrow `Accept` header keeps the SPA fallback from answering a missing file with index.html.
 */
async function fetchFromTab(
  tab: Tab,
  requestPath: string,
  accept = 'text/plain',
  from: Page = tab.page
): Promise<PreviewResponse> {
  return from.evaluate(
    async ({ url, acceptHeader }) => {
      const response = await fetch(url, { headers: { Accept: acceptHeader } })
      return { status: response.status, body: await response.text() }
    },
    { url: `${tab.previewBasePath}${requestPath.slice(1)}`, acceptHeader: accept }
  )
}

async function fetchFromTabUntilServed(tab: Tab, requestPath: string): Promise<PreviewResponse> {
  let response: PreviewResponse | undefined
  await expect
    .poll(
      async () => {
        response = await fetchFromTab(tab, requestPath, 'text/javascript')
        return response.status
      },
      { timeout: 30_000 }
    )
    .toBe(200)
  return response!
}

async function runFileOperation(tab: Tab, operation: string, args: unknown[]): Promise<void> {
  await tab.page.evaluate(
    ({ operation, args }) => (window as any).__vrowzer__[operation](...args),
    { operation, args }
  )
}

async function updateMain(tab: Tab, text: string): Promise<void> {
  await tab.page.evaluate(async content => {
    const fixture = window as any
    await fixture.__vrowzer__.updateFile('/src/main.ts', fixture.__mainSource__(content))
  }, text)
}

async function previewText(page: Page, index: number): Promise<string> {
  return page.evaluate(
    sessionIndex =>
      (
        document.querySelectorAll('#preview-container iframe')[sessionIndex] as
          | HTMLIFrameElement
          | undefined
      )?.contentDocument?.querySelector('#app')?.textContent ?? '',
    index
  )
}

async function expectPreviewText(page: Page, text: string, index = 0): Promise<void> {
  await expect.poll(() => previewText(page, index), { timeout: 30_000 }).toBe(text)
}

/**
 * Sets a value on the window of a preview document. A reload of the preview drops it, an HMR
 * update keeps it.
 */
async function markPreview(page: Page, index = 0): Promise<void> {
  await page.evaluate(sessionIndex => {
    const iframe = document.querySelectorAll('#preview-container iframe')[
      sessionIndex
    ] as HTMLIFrameElement
    ;(iframe.contentWindow as any).__previewMarker__ = 'kept'
  }, index)
}

async function previewMarker(page: Page, index = 0): Promise<unknown> {
  return page.evaluate(sessionIndex => {
    const iframe = document.querySelectorAll('#preview-container iframe')[
      sessionIndex
    ] as HTMLIFrameElement
    return (iframe.contentWindow as any)?.__previewMarker__
  }, index)
}

async function reloadPreview(tab: Tab): Promise<void> {
  await tab.page.evaluate(() => (window as any).__vrowzer__.reloadPreview('preview'))
  await expect.poll(() => previewMarker(tab.page), { timeout: 30_000 }).toBeUndefined()
}

async function recordedEvents(page: Page, type: string): Promise<unknown[]> {
  return page.evaluate(
    eventType =>
      ((window as any).__events__ as { type: string }[]).filter(event => event.type === eventType),
    type
  )
}

/**
 * Stops the Service Worker process that the pages of the context share, and waits until it has
 * stopped. The next request or message starts it again.
 */
async function stopServiceWorker(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page)
  let stopRequested = false
  let stopped = false
  cdp.on('ServiceWorker.workerVersionUpdated', ({ versions }) => {
    if (stopRequested && versions.some(version => version.runningStatus === 'stopped')) {
      stopped = true
    }
  })
  try {
    await cdp.send('ServiceWorker.enable')
    stopRequested = true
    await cdp.send('ServiceWorker.stopAllWorkers')
    await expect.poll(() => stopped, { timeout: 15_000 }).toBe(true)
  } finally {
    await cdp.detach()
  }
}

async function withContext(run: (context: BrowserContext) => Promise<void>): Promise<void> {
  const context = await browser.newContext()
  try {
    await run(context)
  } finally {
    await context.close()
  }
}

beforeAll(async () => {
  await build({ root: FIXTURE_DIR, logLevel: 'silent' })
  server = await preview({
    root: FIXTURE_DIR,
    logLevel: 'silent',
    preview: { port: 0, strictPort: false }
  })
  const address = server.httpServer?.address()
  if (typeof address !== 'object' || !address) {
    throw new Error('Failed to get isolation integration server address')
  }
  origin = `http://localhost:${address.port}`
  browser = await chromium.launch({ headless: true })
}, 120_000)

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

describe('Vrowzer tabs sharing a Service Worker', () => {
  test.each([
    { order: 'A first', names: ['A', 'B'] },
    { order: 'B first', names: ['B', 'A'] }
  ])(
    'serves each tab its own project at the same paths ($order)',
    async ({ names }) => {
      await withContext(async context => {
        const tabs: Record<string, Tab> = {}
        for (const name of names) {
          tabs[name] = await openTab(context, name)
        }

        expect(tabs.A!.previewBasePath).not.toBe(tabs.B!.previewBasePath)
        for (const name of ['A', 'B']) {
          const tab = tabs[name]!
          await expectPreviewText(tab.page, `main ${name}`)
          expect((await fetchFromTab(tab, '/', 'text/html')).body).toContain(
            `<title>Project ${name}</title>`
          )
          expect((await fetchFromTab(tab, '/src/main.ts', 'text/javascript')).body).toContain(
            `main ${name}`
          )
          expect(await fetchFromTab(tab, '/data.txt')).toEqual({
            status: 200,
            body: `data of ${name}`
          })
        }
      })
    },
    90_000
  )

  test('keeps the file changes of each tab in its own project', async () => {
    await withContext(async context => {
      const a = await openTab(context, 'A')
      const b = await openTab(context, 'B')

      await updateMain(a, 'A v2')
      await runFileOperation(a, 'addFile', ['/only-a.txt', 'added in A'])
      await runFileOperation(b, 'deleteFile', ['/data.txt'])
      await runFileOperation(b, 'updateFile', ['/public/hello.txt', 'hello from B'])
      await reloadPreview(a)
      await reloadPreview(b)

      await expectPreviewText(a.page, 'A v2')
      await expectPreviewText(b.page, 'main B')
      expect(await fetchFromTab(a, '/only-a.txt')).toEqual({ status: 200, body: 'added in A' })
      expect((await fetchFromTab(b, '/only-a.txt')).status).toBe(404)
      expect(await fetchFromTab(a, '/data.txt')).toEqual({ status: 200, body: 'data of A' })
      expect((await fetchFromTab(b, '/data.txt')).status).toBe(404)
      expect(await fetchFromTab(a, '/hello.txt')).toEqual({ status: 200, body: 'hello v1' })
      expect(await fetchFromTab(b, '/hello.txt')).toEqual({ status: 200, body: 'hello from B' })
    })
  }, 90_000)

  test('delivers delayed transforms and HMR updates to their own tabs', async () => {
    await withContext(async context => {
      const a = await openTab(context, 'A')
      const b = await openTab(context, 'B')
      await markPreview(a.page)
      await markPreview(b.page)

      // The Web Worker of A holds the load of /held.js
      await a.page.evaluate(base => {
        ;(window as any).__heldRequest__ = fetch(`${base}held.js`, {
          headers: { Accept: 'text/javascript' }
        }).then(async response => ({ status: response.status, body: await response.text() }))
      }, a.previewBasePath)
      await a.page.waitForTimeout(500)

      // Meanwhile, B edits its project, and the HMR update reaches its preview only
      await updateMain(b, 'B v2')
      await expectPreviewText(b.page, 'B v2')
      expect((await fetchFromTab(b, '/src/main.ts', 'text/javascript')).body).toContain('B v2')
      expect(await previewText(a.page, 0)).toBe('main A')

      // The held response reaches A
      await runFileOperation(a, 'updateFile', ['/held-release', ''])
      const held = await a.page.evaluate(() => (window as any).__heldRequest__)
      expect(held.status).toBe(200)
      expect(held.body).toContain('"A"')

      // The HMR updates of A reach its preview only
      await updateMain(a, 'A v2')
      await expectPreviewText(a.page, 'A v2')
      expect(await previewText(b.page, 0)).toBe('B v2')
      // Neither preview reloaded
      expect(await previewMarker(a.page)).toBe('kept')
      expect(await previewMarker(b.page)).toBe('kept')
    })
  }, 90_000)

  test.each(['disposed', 'closed'] as const)(
    'keeps a tab working after the other tab is %s',
    async ending => {
      await withContext(async context => {
        const a = await openTab(context, 'A')
        const b = await openTab(context, 'B')

        if (ending === 'disposed') {
          await b.page.evaluate(() => (window as any).__vrowzer__.dispose())
          // The previews of the disposed instance get 404
          expect((await fetchFromTab(b, '/src/main.ts', 'text/javascript')).status).toBe(404)
        } else {
          await b.page.close()
        }

        // A loads assets, edits its project and reloads its preview
        expect(
          await a.page.evaluate(async base => {
            const response = await fetch(`${base}pixel.png`)
            return [...new Uint8Array(await response.arrayBuffer())]
          }, a.previewBasePath)
        ).toEqual(PIXEL_BYTES)
        await markPreview(a.page)
        await updateMain(a, 'A v2')
        await expectPreviewText(a.page, 'A v2')
        expect(await previewMarker(a.page)).toBe('kept')
        await reloadPreview(a)
        await expectPreviewText(a.page, 'A v2')

        if (ending === 'closed') {
          // A closed tab sends nothing. Its previews are released when another runtime connects.
          await openTab(context, 'C')
          await expect
            .poll(
              async () => (await fetchFromTab(b, '/src/main.ts', 'text/javascript', a.page)).status,
              { timeout: 15_000 }
            )
            .toBe(404)
        }
      })
    },
    90_000
  )

  test('shares the updates of a tab among its previews', async () => {
    await withContext(async context => {
      const a = await openTab(context, 'A')
      const b = await openTab(context, 'B')
      await a.page.evaluate(() =>
        (window as any).__vrowzer__.mount(document.getElementById('preview-container'), {
          id: 'second'
        })
      )
      await expectPreviewText(a.page, 'main A', 1)
      await markPreview(a.page, 0)
      await markPreview(a.page, 1)

      await updateMain(a, 'A v2')

      await expectPreviewText(a.page, 'A v2', 0)
      await expectPreviewText(a.page, 'A v2', 1)
      expect(await previewMarker(a.page, 0)).toBe('kept')
      expect(await previewMarker(a.page, 1)).toBe('kept')
      expect(await previewText(b.page, 0)).toBe('main B')
    })
  }, 90_000)

  test('restores the project of each tab after the Service Worker restarts', async () => {
    await withContext(async context => {
      const a = await openTab(context, 'A')
      const b = await openTab(context, 'B')
      await updateMain(a, 'A v2')
      await updateMain(b, 'B v2')

      await stopServiceWorker(a.page)
      expect((await fetchFromTabUntilServed(a, '/src/main.ts')).body).toContain('A v2')
      expect((await fetchFromTabUntilServed(b, '/src/main.ts')).body).toContain('B v2')
      for (const tab of [a, b]) {
        await expect
          .poll(async () => (await recordedEvents(tab.page, 'serviceWorkerRecovered')).length, {
            timeout: 30_000
          })
          .toBe(1)
        expect(await recordedEvents(tab.page, 'serviceWorkerRecoveryError')).toEqual([])
      }

      // Both tabs edit and reload their previews again
      await markPreview(a.page)
      await markPreview(b.page)
      await updateMain(a, 'A v3')
      await updateMain(b, 'B v3')
      await expectPreviewText(a.page, 'A v3')
      await expectPreviewText(b.page, 'B v3')
      expect(await previewMarker(a.page)).toBe('kept')
      expect(await previewMarker(b.page)).toBe('kept')
      await reloadPreview(a)
      await reloadPreview(b)
      await expectPreviewText(a.page, 'A v3')
      await expectPreviewText(b.page, 'B v3')
    })
  }, 120_000)
})
