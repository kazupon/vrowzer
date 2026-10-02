import { chromium } from '@playwright/test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, preview } from 'vite'
import { afterAll, beforeAll, describe, expect, test } from 'vite-plus/test'

import type { Browser, BrowserContext, Page } from '@playwright/test'
import type { PreviewServer } from 'vite'

// Stopping the Service Worker through the DevTools Protocol affects every page that uses it, so these
// tests use their own fixture, server and browser instead of the shared playground of
// vrowzer.integration-test.ts, and a new browser context for each test.
const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = join(__dirname, 'restart')
const PIXEL_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]

let browser: Browser
let server: PreviewServer
let origin: string

interface Fixture {
  context: BrowserContext
  page: Page
}

interface RecordedEvent {
  type: string
  id?: string
  stage?: string
  status?: number
  message?: string
}

interface PreviewResponse {
  status: number
  body: string
}

/**
 * Opens the fixture in a new browser context, which has a Service Worker of its own, and mounts a
 * preview of a ready Vrowzer instance.
 */
async function openFixture(options: Record<string, unknown> = {}): Promise<Fixture> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`${origin}/`)
  await page.waitForFunction(() => document.body.dataset.fixtureReady === 'true')
  const ready = await page.evaluate(async vrowzerOptions => {
    const fixture = window as any
    const vrowzer = fixture.__createVrowzer__(vrowzerOptions)
    fixture.__vrowzer__ = vrowzer
    const result = await vrowzer.ready({ files: fixture.__previewFiles__ })
    if (result) {
      vrowzer.mount(document.getElementById('preview-container'), { id: 'preview' })
    }
    return result
  }, options)
  expect(ready).toBe(true)
  await expectPreviewText(page, 'main v1')
  return { context, page }
}

/**
 * Stops the Service Worker process and waits until it has stopped. The registration is kept, and
 * the next request or message starts the Service Worker again.
 *
 * The browser stops the Service Worker only after the requests it is handling end, so
 * `whileStopping` can end them. A message sent meanwhile starts the Service Worker again right after
 * it stops.
 */
async function stopServiceWorker(page: Page, whileStopping?: () => Promise<void>): Promise<void> {
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
    await whileStopping?.()
    await expect.poll(() => stopped, { timeout: 15_000 }).toBe(true)
  } finally {
    await cdp.detach()
  }
}

/**
 * Starts the Service Worker with a message, which it does not answer, so that no request keeps it
 * from stopping again.
 */
async function wakeServiceWorkerWithMessage(page: Page): Promise<void> {
  await page.evaluate(() => {
    navigator.serviceWorker.controller?.postMessage({ type: 'vrowzer-test:wake' })
  })
}

/**
 * Reads a preview file through the Service Worker from the host page. A narrow `Accept` header keeps
 * the SPA fallback from answering a missing file with index.html.
 */
async function fetchFromHost(
  page: Page,
  requestPath: string,
  accept = '*/*'
): Promise<PreviewResponse> {
  return page.evaluate(
    async ({ path, acceptHeader }) => {
      const response = await fetch(`/__preview__${path}`, { headers: { Accept: acceptHeader } })
      return { status: response.status, body: await response.text() }
    },
    { path: requestPath, acceptHeader: accept }
  )
}

/**
 * Reads a preview file until it is served, and returns the statuses of every response on the way.
 * The request that starts the Service Worker can reach the host before the Service Worker has
 * started its server, and get the 503 guard page of `@vrowzer/vite-plugin`.
 */
async function fetchUntilServed(
  page: Page,
  requestPath: string
): Promise<PreviewResponse & { statuses: number[] }> {
  const statuses: number[] = []
  let response: PreviewResponse | undefined
  await expect
    .poll(
      async () => {
        response = await fetchFromHost(page, requestPath, 'text/javascript')
        statuses.push(response.status)
        return response.status
      },
      { timeout: 30_000 }
    )
    .toBe(200)
  return { ...response!, statuses }
}

async function fetchBytes(
  page: Page,
  requestPath: string,
  from: 'host' | 'preview'
): Promise<{ status: number; bytes: number[] }> {
  return page.evaluate(
    async ({ path, inPreview }) => {
      const target = inPreview
        ? (document.querySelector('#preview-container iframe') as HTMLIFrameElement).contentWindow!
        : window
      const response = await target.fetch(`/__preview__${path}`)
      return { status: response.status, bytes: [...new Uint8Array(await response.arrayBuffer())] }
    },
    { path: requestPath, inPreview: from === 'preview' }
  )
}

async function recordedEvents(page: Page, type: string): Promise<RecordedEvent[]> {
  return page.evaluate(
    eventType =>
      ((window as any).__events__ as RecordedEvent[]).filter(event => event.type === eventType),
    type
  )
}

async function waitForRecoveries(page: Page, count: number): Promise<void> {
  await expect
    .poll(async () => (await recordedEvents(page, 'serviceWorkerRecovered')).length, {
      timeout: 30_000
    })
    .toBe(count)
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
async function markPreview(page: Page, index: number): Promise<void> {
  await page.evaluate(sessionIndex => {
    const iframe = document.querySelectorAll('#preview-container iframe')[
      sessionIndex
    ] as HTMLIFrameElement
    ;(iframe.contentWindow as any).__previewMarker__ = 'kept'
  }, index)
}

async function previewMarker(page: Page, index: number): Promise<unknown> {
  return page.evaluate(sessionIndex => {
    const iframe = document.querySelectorAll('#preview-container iframe')[
      sessionIndex
    ] as HTMLIFrameElement
    return (iframe.contentWindow as any)?.__previewMarker__
  }, index)
}

async function updateMain(page: Page, text: string): Promise<void> {
  await page.evaluate(async content => {
    const fixture = window as any
    await fixture.__vrowzer__.updateFile('/main.js', fixture.__mainSource__(content))
  }, text)
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
    throw new Error('Failed to get restart integration server address')
  }
  origin = `http://localhost:${address.port}`
  browser = await chromium.launch({ headless: true })
}, 120_000)

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

describe('Vrowzer Service Worker restart', () => {
  test('restores the latest files after the Service Worker restarts', async () => {
    const { context, page } = await openFixture()
    try {
      await page.evaluate(async () => {
        const fixture = window as any
        const vrowzer = fixture.__vrowzer__
        await vrowzer.updateFile('/main.js', fixture.__mainSource__('main v2'))
        await vrowzer.addFile('/added.js', 'export const added = true')
        await vrowzer.deleteFile('/remove-me.js')
        await vrowzer.updateFile('/public/hello.txt', 'hello v2')
      })

      await stopServiceWorker(page)
      const main = await fetchUntilServed(page, '/main.js')
      await waitForRecoveries(page, 1)

      // The restarted Service Worker holds requests until the Web Worker channel is connected again,
      // so none of them gets a 404 or a 500
      expect(main.statuses.filter(status => status !== 200 && status !== 503)).toEqual([])
      expect(main.body).toContain('main v2')
      const html = await fetchFromHost(page, '/', 'text/html')
      expect(html.status).toBe(200)
      expect(html.body).toContain('<div id="app"></div>')
      expect(html.body).toContain('@vite/client')
      const added = await fetchFromHost(page, '/added.js', 'text/javascript')
      expect(added.status).toBe(200)
      expect(added.body).toContain('added = true')
      expect((await fetchFromHost(page, '/remove-me.js', 'text/javascript')).status).toBe(404)
      expect(await fetchFromHost(page, '/hello.txt')).toEqual({ status: 200, body: 'hello v2' })
      expect(await fetchBytes(page, '/pixel.png', 'host')).toEqual({
        status: 200,
        bytes: PIXEL_BYTES
      })
      expect(await recordedEvents(page, 'serviceWorkerRecoveryError')).toEqual([])
    } finally {
      await context.close()
    }
  }, 60_000)

  test('keeps editing, HMR, assets and preview reloads working after a restart', async () => {
    const { context, page } = await openFixture()
    try {
      const hostMarker = await page.evaluate(() => (window as any).__hostMarker__)
      await stopServiceWorker(page)
      await fetchUntilServed(page, '/main.js')
      await waitForRecoveries(page, 1)

      // An HMR update reaches the open preview without reloading it
      await markPreview(page, 0)
      await updateMain(page, 'main v2')
      await expectPreviewText(page, 'main v2')
      expect(await previewMarker(page, 0)).toBe('kept')

      // The preview loads assets
      expect(await fetchBytes(page, '/pixel.png', 'preview')).toEqual({
        status: 200,
        bytes: PIXEL_BYTES
      })

      // An explicit reload loads the latest contents in a new document
      await page.evaluate(() => (window as any).__vrowzer__.reloadPreview('preview'))
      await expect.poll(() => previewMarker(page, 0), { timeout: 30_000 }).toBeUndefined()
      await expectPreviewText(page, 'main v2')

      // A preview mounted after the restart gets its HMR port through the new channel
      await page.evaluate(() =>
        (window as any).__vrowzer__.mount(document.getElementById('preview-container'), {
          id: 'second'
        })
      )
      await expectPreviewText(page, 'main v2', 1)
      await markPreview(page, 0)
      await markPreview(page, 1)
      await updateMain(page, 'main v3')
      await expectPreviewText(page, 'main v3', 0)
      await expectPreviewText(page, 'main v3', 1)
      expect(await previewMarker(page, 0)).toBe('kept')
      expect(await previewMarker(page, 1)).toBe('kept')

      expect(await page.evaluate(() => (window as any).__hostMarker__)).toBe(hostMarker)
      expect(await recordedEvents(page, 'serviceWorkerRecoveryError')).toEqual([])
    } finally {
      await context.close()
    }
  }, 90_000)

  test('recovers when the Service Worker stops during a pending request', async () => {
    const { context, page } = await openFixture()
    try {
      // The Web Worker holds the load of /held.js, so the request waits in the Service Worker
      await page.evaluate(() => {
        ;(window as any).__heldRequest__ = fetch('/__preview__/held.js', {
          headers: { Accept: 'text/javascript' }
        }).then(
          response => ({ status: response.status }),
          (error: unknown) => ({ error: String(error) })
        )
      })
      await page.waitForTimeout(1000)

      // The Service Worker stops once the pending request ends, so let the Web Worker answer it
      await stopServiceWorker(page, async () => {
        await page.evaluate(() => (window as any).__vrowzer__.updateFile('/held-release', ''))
      })

      // The pending request ends, with or without a response, instead of waiting forever
      const held = await page.evaluate(() =>
        Promise.race([
          (window as any).__heldRequest__,
          new Promise(resolve => setTimeout(() => resolve({ timedOut: true }), 15_000))
        ])
      )
      expect(held).not.toHaveProperty('timedOut')
      const response = await fetchUntilServed(page, '/held.js')
      expect(response.body).toContain('held = true')
      await waitForRecoveries(page, 1)
      expect(await recordedEvents(page, 'serviceWorkerRecoveryError')).toEqual([])
    } finally {
      await context.close()
    }
  }, 90_000)

  test('recovers each time the Service Worker restarts', async () => {
    const { context, page } = await openFixture()
    try {
      for (let restart = 1; restart <= 3; restart++) {
        await updateMain(page, `main restart ${restart}`)
        await stopServiceWorker(page)

        const main = await fetchUntilServed(page, '/main.js')
        await waitForRecoveries(page, restart)

        expect(main.body).toContain(`main restart ${restart}`)
      }
      expect(await recordedEvents(page, 'serviceWorkerRecoveryError')).toEqual([])
    } finally {
      await context.close()
    }
  }, 90_000)

  test('reports a recovery that cannot finish and answers waiting requests with 503', async () => {
    const { context, page } = await openFixture({ fileSyncTimeout: 2000 })
    try {
      // Without the Web Worker, the channel cannot be connected again
      await page.evaluate(() => (window as any).__terminateWebWorkers__())
      await stopServiceWorker(page)

      // Start the Service Worker, and change a file while it is being restored. The change goes to
      // the Web Worker right away, which no longer answers.
      void fetchFromHost(page, '/main.js').catch(() => {})
      const update = page.evaluate(() =>
        (window as any).__vrowzer__.updateFile('/main.js', 'export {}').then(
          () => 'resolved',
          (error: Error) => error.message
        )
      )
      await expect
        .poll(async () => (await recordedEvents(page, 'serviceWorkerRecoveryError')).length, {
          timeout: 15_000
        })
        .toBe(1)
      const [error] = await recordedEvents(page, 'serviceWorkerRecoveryError')
      expect(error!.message).toContain('timed out after 2000ms')
      expect(await update).toContain('timed out after 2000ms waiting for the Web Worker')
      expect(await recordedEvents(page, 'serviceWorkerRecovered')).toEqual([])

      // A request waits for the Web Worker for 10 seconds at most
      const startedAt = Date.now()
      const response = await fetchFromHost(page, '/main.js', 'text/javascript')
      expect(Date.now() - startedAt).toBeLessThan(15_000)
      expect(response.status).toBe(503)
      expect(response.body).toContain('no Web Worker connected within 10000ms')

      // The preview reports the failure when it loads again
      await page.evaluate(() => (window as any).__vrowzer__.reloadPreview('preview'))
      await expect
        .poll(async () => (await recordedEvents(page, 'previewLoadError')).length, {
          timeout: 20_000
        })
        .toBeGreaterThan(0)
      const [loadError] = await recordedEvents(page, 'previewLoadError')
      expect(loadError).toMatchObject({ id: 'preview', stage: 'html', status: 503 })
    } finally {
      await context.close()
    }
  }, 90_000)

  test('does not restore an instance disposed during the recovery', async () => {
    const { context, page } = await openFixture()
    try {
      // The listener runs after the one of the runtime, which starts the recovery
      await page.evaluate(() => {
        const fixture = window as any
        fixture.__startNotices__ = 0
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data?.type !== 'V_SW_INSTANCE_STARTED') {
            return
          }
          fixture.__startNotices__++
          if (fixture.__disposeMark__ === undefined) {
            fixture.__disposeMark__ = fixture.__serviceWorkerMessages__.length
            fixture.__disposed__ = fixture.__vrowzer__.dispose()
          }
        })
      })

      await stopServiceWorker(page)
      await wakeServiceWorkerWithMessage(page)
      await expect
        .poll(() => page.evaluate(() => (window as any).__startNotices__), { timeout: 30_000 })
        .toBe(1)
      await page.evaluate(() => (window as any).__disposed__)

      // A later restart does not restore it either
      await stopServiceWorker(page)
      await wakeServiceWorkerWithMessage(page)
      await expect
        .poll(() => page.evaluate(() => (window as any).__startNotices__), { timeout: 30_000 })
        .toBe(2)
      await page.waitForTimeout(500)

      const sentAfterDispose = await page.evaluate(() => {
        const fixture = window as any
        return (fixture.__serviceWorkerMessages__ as string[]).slice(fixture.__disposeMark__)
      })
      expect(sentAfterDispose).not.toContain('V_WW_CONNECT_PORT')
      expect(await recordedEvents(page, 'serviceWorkerRecovered')).toEqual([])
    } finally {
      await context.close()
    }
  }, 90_000)
})
