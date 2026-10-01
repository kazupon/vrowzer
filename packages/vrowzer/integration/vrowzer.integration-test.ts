/**
 * Vrowzer E2E Tests
 *
 * Verifies that the vrowzer library works end-to-end in a browser environment.
 * Builds a test playground with Vite + Vrowzer, starts vite preview server,
 * then uses Playwright to verify preview initialization, file operations, and HMR.
 */

import { chromium } from '@playwright/test'
import { createServer as createHttpServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, preview } from 'vite'
import { afterAll, beforeAll, describe, expect, test } from 'vite-plus/test'

import type { Browser, Page, Response as PlaywrightResponse } from '@playwright/test'
import type { Server as HttpServer } from 'node:http'
import type { Plugin, PreviewServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLAYGROUND_DIR = join(__dirname, 'playground')

const E2E_DEBUG = process.env.E2E_DEBUG === '1' || process.env.E2E_DEBUG === 'true'
const debug = (...args: unknown[]) => E2E_DEBUG && console.log('[E2E]', ...args)
const SERVICE_WORKER_RESPONSE_DELAY = Number(process.env.VROWZER_TEST_SW_RESPONSE_DELAY ?? 0)
const CUSTOM_SERVICE_WORKER_READY_TIMEOUT = process.env.VROWZER_TEST_SW_READY_TIMEOUT
  ? Number(process.env.VROWZER_TEST_SW_READY_TIMEOUT)
  : undefined
const HOST_FETCH_PROBE_PATH = '/vrowzer-host-fetch-probe.txt'
const CROSS_ORIGIN_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
)

let browser: Browser
let server: PreviewServer
let crossOriginAssetServer: HttpServer
let page: Page
let serverUrl: string
let crossOriginAssetServerUrl: string
let pageConsoleLogs: string[] = []
let delayedServiceWorkerRequests = 0
let hmrClientProbeId = 0
// Requests within the preview base path that reached the host server
const hostPreviewRequests: string[] = []

function delayServiceWorkerResponse(delay: number): Plugin {
  return {
    name: 'vrowzer:test-delay-service-worker-response',
    configurePreviewServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (!request.url?.startsWith('/assets/service-worker-')) {
          next()
          return
        }
        delayedServiceWorkerRequests++
        setTimeout(next, delay)
      })
    }
  }
}

function serveHostFetchProbe(): Plugin {
  return {
    name: 'vrowzer:test-host-fetch-probe',
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
        if (pathname !== HOST_FETCH_PROBE_PATH) {
          next()
          return
        }

        response.statusCode = 200
        response.setHeader('Content-Type', 'text/plain; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        response.end('host-owned')
      })
    }
  }
}

/**
 * Records the requests within the preview base path that reach the host server. It runs before
 * the guard of `@vrowzer/vite-plugin`, which answers such requests.
 */
function recordHostPreviewRequests(): Plugin {
  return {
    name: 'vrowzer:test-record-host-preview-requests',
    enforce: 'pre',
    configurePreviewServer(server) {
      server.middlewares.use((request, _response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
        if (pathname.startsWith('/__preview__/')) {
          hostPreviewRequests.push(`${request.method} ${pathname}`)
        }
        next()
      })
    }
  }
}

async function closeHttpServer(server: HttpServer | undefined): Promise<void> {
  if (!server?.listening) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

async function captureResponse<T>(
  requestUrl: string,
  operation: () => Promise<T>
): Promise<{ result: T; response: PlaywrightResponse | undefined }> {
  let matchingResponse: PlaywrightResponse | undefined
  const onResponse = (response: PlaywrightResponse) => {
    if (response.url() === requestUrl) {
      matchingResponse = response
    }
  }

  page.on('response', onResponse)
  try {
    const result = await operation()
    return { result, response: matchingResponse }
  } finally {
    page.off('response', onResponse)
  }
}

interface PreviewResponse {
  status: number
  body: string
}

interface SourceMapPayload {
  sourcesContent?: (string | null)[]
  [key: string]: unknown
}

async function addPreviewFiles(files: Record<string, string>): Promise<void> {
  await page.evaluate(async filesToAdd => {
    const vrowzer = (window as any).__vrowzer__
    await Promise.all(
      Object.entries(filesToAdd).map(([filePath, content]) => vrowzer.addFile(filePath, content))
    )
  }, files)
}

function createMultiSessionSource(revision: string): string {
  return `
const context = globalThis.__VROWZER_PREVIEW__
globalThis.__vrowzerContextAtScriptStart = context
globalThis.__vrowzerBootToken = crypto.randomUUID()
document.getElementById('app').innerHTML =
  '<h1 data-preview-id="' + context.id + '">' + context.id + '</h1>' +
  '<p data-revision="${revision}">${revision}</p>'

if (import.meta.hot) {
  import.meta.hot.accept()
}
`
}

async function readHmrClientIds(): Promise<string[]> {
  const probeId = ++hmrClientProbeId
  const resultKey = `__vrowzerHmrClientProbe${probeId}`
  const filePath = `/hmr-client-probe-${probeId}.js`
  await addPreviewFiles({
    [filePath]: `
import clientIds from 'virtual:vrowzer-test-hmr-clients?probe=${probeId}'
globalThis[${JSON.stringify(resultKey)}] = { clientIds }
`
  })

  await page.evaluate(
    ({ filePath, resultKey }) => {
      const iframe = document.querySelector('#preview-container iframe') as HTMLIFrameElement | null
      const iframeDocument = iframe?.contentDocument
      const iframeWindow = iframe?.contentWindow as any
      if (!iframeDocument || !iframeWindow) {
        throw new Error('Primary preview iframe is not available')
      }
      delete iframeWindow[resultKey]
      const script = iframeDocument.createElement('script')
      script.type = 'module'
      script.src = `/__preview__${filePath}`
      iframeDocument.head.append(script)
    },
    { filePath, resultKey }
  )

  await expect
    .poll(
      () =>
        page.evaluate(resultKey => {
          const iframe = document.querySelector(
            '#preview-container iframe'
          ) as HTMLIFrameElement | null
          return (iframe?.contentWindow as any)?.[resultKey]?.clientIds
        }, resultKey),
      { timeout: 10_000 }
    )
    .toBeTruthy()

  return page.evaluate(resultKey => {
    const iframe = document.querySelector('#preview-container iframe') as HTMLIFrameElement | null
    return (iframe?.contentWindow as any)[resultKey].clientIds
  }, resultKey)
}

async function waitForHmrClientCount(expectedCount: number): Promise<string[]> {
  let clientIds: string[] = []
  await expect
    .poll(
      async () => {
        clientIds = await readHmrClientIds()
        return clientIds.length
      },
      { timeout: 15_000 }
    )
    .toBe(expectedCount)
  return clientIds
}

async function fetchFromPreview(requestPath: string): Promise<PreviewResponse> {
  return page.evaluate(async path => {
    const iframe = document.querySelector('#preview-container iframe') as HTMLIFrameElement | null
    if (!iframe?.contentWindow) {
      throw new Error('Preview iframe is not available')
    }

    const response = await iframe.contentWindow.fetch(`/__preview__${path}`)
    return {
      status: response.status,
      body: await response.text()
    }
  }, requestPath)
}

/**
 * Reads a preview file through the Service Worker from the host page. Unlike the preview iframe,
 * the host page is not reloaded by HMR, so a read right after a file change is not interrupted.
 */
async function fetchFromServiceWorker(
  requestPath: string
): Promise<PreviewResponse & { contentType: string | null }> {
  return page.evaluate(async path => {
    const response = await fetch(`/__preview__${path}`)
    return {
      status: response.status,
      body: await response.text(),
      contentType: response.headers.get('Content-Type')
    }
  }, requestPath)
}

async function fetchBytesFromServiceWorker(
  requestPath: string
): Promise<{ status: number; bytes: number[] }> {
  return page.evaluate(async path => {
    const response = await fetch(`/__preview__${path}`)
    return { status: response.status, bytes: [...new Uint8Array(await response.arrayBuffer())] }
  }, requestPath)
}

/**
 * Runs `addFile()`, `updateFile()` or `deleteFile()` on the playground's instance and waits for it.
 */
async function runFileOperation(operation: string, args: unknown[]): Promise<void> {
  await page.evaluate(({ operation, args }) => (window as any).__vrowzer__[operation](...args), {
    operation,
    args
  })
}

/**
 * Makes a test module accept its own updates, so that changing it does not reload the preview.
 */
function selfAccepting(code: string): string {
  return `${code}\nif (import.meta.hot) { import.meta.hot.accept() }\n`
}

/**
 * Releases what the playground's file sync test plugin holds in the Web Worker.
 */
async function releaseHeldFileChanges(): Promise<void> {
  await page.evaluate(() => {
    return (window as any).__vrowzer__.updateFile('/file-sync/release', '')
  })
}

async function waitForPreviewResponse(
  requestPath: string,
  expectedStatus: number
): Promise<PreviewResponse> {
  let response: PreviewResponse | undefined

  await expect
    .poll(
      async () => {
        try {
          response = await fetchFromPreview(requestPath)
          return response.status
        } catch {
          return undefined
        }
      },
      { timeout: 10_000 }
    )
    .toBe(expectedStatus)

  if (!response) {
    throw new Error(`No preview response for ${requestPath}`)
  }
  return response
}

async function waitForPreviewBodyContaining(
  requestPath: string,
  expectedContent: string
): Promise<PreviewResponse> {
  let response: PreviewResponse | undefined

  await expect
    .poll(
      async () => {
        try {
          response = await fetchFromPreview(requestPath)
          return response.body
        } catch {
          return undefined
        }
      },
      { timeout: 10_000 }
    )
    .toContain(expectedContent)

  if (!response) {
    throw new Error(`No preview response for ${requestPath}`)
  }
  return response
}

function createInlineSourceMapComment(map: SourceMapPayload): string {
  return `//# sourceMappingURL=data:application/json;base64,${btoa(JSON.stringify(map))}`
}

function extractInlineSourceMap(code: string): SourceMapPayload {
  const matches = [
    ...code.matchAll(/sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/g)
  ]
  const encoded = matches.at(-1)?.[1]
  if (!encoded) {
    throw new Error('Response does not contain an inline source map')
  }
  return JSON.parse(atob(encoded)) as SourceMapPayload
}

beforeAll(async () => {
  if (!Number.isFinite(SERVICE_WORKER_RESPONSE_DELAY) || SERVICE_WORKER_RESPONSE_DELAY < 0) {
    throw new Error('VROWZER_TEST_SW_RESPONSE_DELAY must be a non-negative finite number')
  }
  if (
    CUSTOM_SERVICE_WORKER_READY_TIMEOUT !== undefined &&
    (!Number.isFinite(CUSTOM_SERVICE_WORKER_READY_TIMEOUT) ||
      CUSTOM_SERVICE_WORKER_READY_TIMEOUT < 0)
  ) {
    throw new Error('VROWZER_TEST_SW_READY_TIMEOUT must be a non-negative finite number')
  }
  if (
    CUSTOM_SERVICE_WORKER_READY_TIMEOUT !== undefined &&
    SERVICE_WORKER_RESPONSE_DELAY <= CUSTOM_SERVICE_WORKER_READY_TIMEOUT
  ) {
    throw new Error(
      'VROWZER_TEST_SW_RESPONSE_DELAY must be greater than VROWZER_TEST_SW_READY_TIMEOUT'
    )
  }

  debug('Building playground...')
  await build({
    root: PLAYGROUND_DIR,
    logLevel: E2E_DEBUG ? 'info' : 'silent'
  })
  debug('Build complete')

  crossOriginAssetServer = createHttpServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
    if (pathname !== '/pixel.png') {
      response.writeHead(404)
      response.end('Not Found')
      return
    }

    response.statusCode = 200
    response.setHeader('Content-Type', 'image/png')
    response.setHeader('Content-Length', String(CROSS_ORIGIN_PIXEL.byteLength))
    response.setHeader('Cache-Control', 'no-store')
    response.end(CROSS_ORIGIN_PIXEL)
  })
  await new Promise<void>((resolve, reject) => {
    crossOriginAssetServer.once('error', reject)
    crossOriginAssetServer.listen(0, '127.0.0.1', resolve)
  })

  const crossOriginAddress = crossOriginAssetServer.address()
  if (!crossOriginAddress || typeof crossOriginAddress === 'string') {
    throw new Error('Failed to get cross-origin asset server address')
  }
  crossOriginAssetServerUrl = `http://127.0.0.1:${crossOriginAddress.port}`

  server = await preview({
    root: PLAYGROUND_DIR,
    plugins: [
      recordHostPreviewRequests(),
      serveHostFetchProbe(),
      ...(SERVICE_WORKER_RESPONSE_DELAY > 0
        ? [delayServiceWorkerResponse(SERVICE_WORKER_RESPONSE_DELAY)]
        : [])
    ],
    preview: {
      port: 0,
      strictPort: false,
      headers: {
        'Service-Worker-Allowed': '/',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless'
      }
    }
  })

  const address = server.httpServer.address()
  if (typeof address === 'object' && address) {
    serverUrl = `http://localhost:${address.port}`
  } else {
    throw new Error('Failed to get preview server address')
  }
  debug('Preview server started at', serverUrl)

  browser = await chromium.launch({ headless: true })
  debug('Browser launched')

  page = await browser.newPage()

  // Collect console logs for debugging. Always keep them in memory so failures in
  // non-debug mode still include the browser-side ready() error.
  page.on('console', msg => {
    const log = `[browser ${msg.type()}] ${msg.text()}`
    pageConsoleLogs.push(log)
    debug(log)
  })
  page.on('pageerror', err => {
    const log = `[browser error] ${err.message}`
    pageConsoleLogs.push(log)
    debug(log)
  })

  const initializationStartedAt = Date.now()
  await page.goto(serverUrl)

  // Wait for ready() to complete (status becomes "Ready" or error).
  try {
    await page.waitForFunction(
      () => {
        const text = document.getElementById('status')?.textContent ?? ''
        return text === 'Ready' || text.startsWith('Error') || text.startsWith('Failed')
      },
      undefined,
      { timeout: 60000 }
    )
  } catch (error) {
    const status = await page.textContent('#status')
    throw new Error(
      `Timed out waiting for vrowzer playground to finish initialization; status=${JSON.stringify(status)}\n${pageConsoleLogs.join('\n')}`,
      { cause: error }
    )
  }

  const status = await page.textContent('#status')
  debug('Status:', status)

  if (status !== 'Ready') {
    throw new Error(
      `Expected vrowzer playground to become Ready, got ${JSON.stringify(status)}\n${pageConsoleLogs.join('\n')}`
    )
  }

  if (SERVICE_WORKER_RESPONSE_DELAY > 0) {
    if (delayedServiceWorkerRequests === 0) {
      throw new Error('The Service Worker response delay did not match a request')
    }
    console.log(
      `[E2E] Service Worker response delayed by ${SERVICE_WORKER_RESPONSE_DELAY}ms; ` +
        `Vrowzer became ready in ${Date.now() - initializationStartedAt}ms`
    )
  }
}, 120000)

afterAll(async () => {
  try {
    await page?.close()
    await browser?.close()
    await server?.close()
  } finally {
    await closeHttpServer(crossOriginAssetServer)
  }
  debug('Cleanup complete')
})

describe('Vrowzer E2E', () => {
  describe('initialization', () => {
    test('page loads and shows ready status', async () => {
      expect(await page.textContent('#status')).toBe('Ready')
    })

    test('ready() resolves and status shows Ready', async () => {
      const status = await page.textContent('#status')
      debug('Final status:', status)
      expect(status).toBe('Ready')
    })

    test('mount() creates iframe in container', async () => {
      const iframe = await page.$('#preview-container iframe')
      expect(iframe).not.toBeNull()
    })

    test('iframe has credentialless attribute', async () => {
      const credentialless = await page.$eval('#preview-container iframe', el =>
        el.hasAttribute('credentialless')
      )
      expect(credentialless).toBe(true)
    })

    test('iframe has sandbox="allow-scripts allow-same-origin"', async () => {
      const sandbox = await page.$eval('#preview-container iframe', el =>
        el.getAttribute('sandbox')
      )
      expect(sandbox).toBe(
        'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'
      )
    })

    test('preview content is rendered in iframe', async () => {
      // The initial HMR full-reload can replace the document between browser reads.
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const iframe = document.querySelector(
                '#preview-container iframe'
              ) as HTMLIFrameElement | null
              const text = iframe?.contentDocument?.body?.innerText
              return {
                greeting: text?.includes('Hello from Vrowzer!') ?? false,
                counter: text?.includes('count: 0') ?? false
              }
            }),
          { timeout: 30_000 }
        )
        .toEqual({ greeting: true, counter: true })
    }, 60000)

    test('injects preview context before application scripts run', async () => {
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const iframe = document.querySelector(
                '#preview-container iframe'
              ) as HTMLIFrameElement | null
              return {
                captured: (iframe?.contentWindow as any)?.__vrowzerContextAtScriptStart,
                current: (iframe?.contentWindow as any)?.__VROWZER_PREVIEW__,
                dataset: iframe?.contentDocument?.documentElement.dataset.vrowzerPreviewId
              }
            }),
          { timeout: 30_000 }
        )
        .toEqual({
          captured: { id: 'preview', params: { viewport: 'primary' } },
          current: { id: 'preview', params: { viewport: 'primary' } },
          dataset: 'preview'
        })
    })

    test('shows the README usage example without /index.html', async () => {
      // The playground gives ready() only the /main.js of the README usage example. A new browser
      // context has a Service Worker of its own, so the shared playground is not affected.
      const context = await browser.newContext()
      const readmePage = await context.newPage()

      try {
        await readmePage.goto(`${serverUrl}?files=readme-example`)
        await readmePage.waitForFunction(
          () => document.getElementById('status')?.textContent === 'Ready',
          undefined,
          { timeout: 60_000 }
        )
        await readmePage.waitForFunction(
          () =>
            (
              document.querySelector('#preview-container iframe') as HTMLIFrameElement | null
            )?.contentDocument?.querySelector('#app h1')?.textContent === 'Hello!',
          undefined,
          { timeout: 30_000 }
        )
      } finally {
        await context.close()
      }
    }, 120_000)
  })

  describe('file operations', () => {
    test('updateFile() triggers preview update', async () => {
      // Update main.js via vrowzer API
      await page.evaluate(() => {
        const vrowzer = (window as any).__vrowzer__
        return vrowzer.updateFile(
          '/main.js',
          `
document.getElementById('app').innerHTML = '<h1>Updated!</h1><p id="result">1 + 1 = 2</p>'

if (import.meta.hot) {
  import.meta.hot.accept()
}
`
        )
      })

      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const iframe = document.querySelector(
                '#preview-container iframe'
              ) as HTMLIFrameElement | null
              const text = iframe?.contentDocument?.body?.innerText
              return {
                updated: text?.includes('Updated!') ?? false,
                result: text?.includes('1 + 1 = 2') ?? false
              }
            }),
          { timeout: 15_000 }
        )
        .toEqual({ updated: true, result: true })
    }, 30000)

    test('stays pending while the Web Worker applies a change, and later reads see it', async () => {
      const path = '/file-sync/held/module.js'
      await addPreviewFiles({ [path]: selfAccepting(`export const value = 'held-v1'`) })
      // Cache the transform result of the first version
      expect((await fetchFromServiceWorker(path)).body).toContain('held-v1')

      try {
        await page.evaluate(
          ({ path, content }) => {
            const state = { settled: false }
            ;(window as any).__fileSyncHeld__ = state
            ;(window as any).__fileSyncHeldUpdate__ = (window as any).__vrowzer__
              .updateFile(path, content)
              .finally(() => {
                state.settled = true
              })
          },
          { path, content: selfAccepting(`export const value = 'held-v2'`) }
        )

        await page.waitForTimeout(500)
        expect(await page.evaluate(() => (window as any).__fileSyncHeld__.settled)).toBe(false)
        // The Web Worker has not invalidated the module yet, so reads still get the cached result
        expect((await fetchFromServiceWorker(path)).body).toContain('held-v1')

        // Releasing writes another path, so it resolves without waiting for the held change
        await releaseHeldFileChanges()
        await page.evaluate(() => (window as any).__fileSyncHeldUpdate__)

        const response = await fetchFromServiceWorker(path)
        expect(response.body).toContain('held-v2')
        expect(response.body).not.toContain('held-v1')
      } finally {
        await releaseHeldFileChanges()
      }
    }, 30000)

    test('resolves each kind of operation, and later reads follow them', async () => {
      const path = '/file-sync/kinds/module.js'

      await runFileOperation('addFile', [path, selfAccepting(`export const value = 'kinds-v1'`)])
      expect((await fetchFromServiceWorker(path)).body).toContain('kinds-v1')

      await runFileOperation('updateFile', [path, selfAccepting(`export const value = 'kinds-v2'`)])
      expect((await fetchFromServiceWorker(path)).body).toContain('kinds-v2')

      // Writing the same content, and adding a file that nothing imports, settle as well
      await runFileOperation('updateFile', [path, selfAccepting(`export const value = 'kinds-v2'`)])
      await runFileOperation('addFile', ['/file-sync/kinds/unused.js', 'export {}'])

      await runFileOperation('deleteFile', [path])
      expect((await fetchFromServiceWorker(path)).body).not.toContain('kinds-v2')
      // Deleting a file that no longer exists settles too
      await runFileOperation('deleteFile', [path])

      await runFileOperation('addFile', [path, selfAccepting(`export const value = 'kinds-v3'`)])
      expect((await fetchFromServiceWorker(path)).body).toContain('kinds-v3')
    }, 30000)

    test('makes a deletion visible before its HMR update finishes', async () => {
      const path = '/file-sync/held-hmr/module.js'
      await addPreviewFiles({ [path]: selfAccepting(`export const value = 'held-hmr-v1'`) })
      // Cache the transform result of the file
      expect((await fetchFromServiceWorker(path)).body).toContain('held-hmr-v1')

      try {
        // The plugin holds the HMR update of this deletion, which does not delay the promise
        await page.evaluate(path => (window as any).__vrowzer__.deleteFile(path), path)
        expect((await fetchFromServiceWorker(path)).body).not.toContain('held-hmr-v1')
      } finally {
        await releaseHeldFileChanges()
      }
    }, 30000)

    test('copies binary content for both Workers and keeps the caller buffer usable', async () => {
      const path = '/file-sync/binary/pixel.png'
      const bytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]

      const caller = await page.evaluate(
        async ({ path, bytes }) => {
          const buffer = new Uint8Array(bytes).buffer
          await (window as any).__vrowzer__.addFile(path, buffer)
          return { byteLength: buffer.byteLength, bytes: [...new Uint8Array(buffer)] }
        },
        { path, bytes }
      )
      expect(caller).toEqual({ byteLength: bytes.length, bytes })

      // The Service Worker serves the file from its virtual filesystem
      expect(await fetchBytesFromServiceWorker(path)).toEqual({ status: 200, bytes })
      // The Web Worker inlines the file from its own virtual filesystem
      const inlined = await fetchFromServiceWorker(`${path}?import&inline`)
      const base64 = inlined.body.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)?.[1]
      expect(base64).toBeDefined()
      expect([...Buffer.from(base64!, 'base64')]).toEqual(bytes)
    }, 30000)

    test('rejects when the Web Worker fails to apply a change, and writing again converges', async () => {
      const path = '/file-sync/fail-once/module.js'

      const message = await page.evaluate(async path => {
        try {
          await (window as any).__vrowzer__.addFile(path, `export const value = 'fail-v1'`)
          return null
        } catch (error) {
          return (error as Error).message
        }
      }, path)
      expect(message).toContain(`addFile("${path}") failed in the Web Worker`)
      expect(message).toContain(`vrowzer-test: watchChange failed for ${path}`)

      await page.evaluate(
        path => (window as any).__vrowzer__.updateFile(path, `export const value = 'fail-v2'`),
        path
      )
      const response = await fetchFromServiceWorker(path)
      expect(response.body).toContain('fail-v2')
      expect(response.body).not.toContain('fail-v1')
    }, 30000)
  })

  describe('public files', () => {
    test('serves a public file given to ready()', async () => {
      expect(await fetchFromServiceWorker('/initial-public.txt')).toEqual({
        status: 200,
        body: 'initial public file',
        contentType: expect.stringContaining('text/plain')
      })
    })

    test('serves public file changes as soon as the file operations resolve', async () => {
      const path = '/public/public-files/added.txt'
      const url = '/public-files/added.txt'

      // No polling: the promise resolves after the Service Worker has updated its public file list
      await runFileOperation('addFile', [path, 'public v1'])
      expect(await fetchFromServiceWorker(url)).toEqual({
        status: 200,
        body: 'public v1',
        contentType: expect.stringContaining('text/plain')
      })

      await runFileOperation('updateFile', [path, 'public v2'])
      expect((await fetchFromServiceWorker(url)).body).toBe('public v2')

      await runFileOperation('deleteFile', [path])
      expect((await fetchFromServiceWorker(url)).body).not.toContain('public v2')
    })

    test('serves binary public files with the same bytes', async () => {
      const bytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]

      await page.evaluate(
        bytes =>
          (window as any).__vrowzer__.addFile(
            '/public/public-files/pixel.png',
            new Uint8Array(bytes).buffer
          ),
        bytes
      )

      expect(await fetchBytesFromServiceWorker('/public-files/pixel.png')).toEqual({
        status: 200,
        bytes
      })
    })

    test('serves a public file instead of a module with the same path', async () => {
      await addPreviewFiles({
        '/public-files/precedence.js': `export const source = 'module'`,
        '/public/public-files/precedence.js': `export const source = 'public'`
      })

      // Public files are served as-is, before the transform middleware
      expect((await fetchFromServiceWorker('/public-files/precedence.js')).body).toBe(
        `export const source = 'public'`
      )
    })
  })

  describe('binary files given to ready()', () => {
    // The bytes of the playground's initialBinaryFiles
    const bytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]

    test('serves them from the Service Worker with the same bytes', async () => {
      // A public file, served by servePublicMiddleware
      expect(await fetchBytesFromServiceWorker('/initial-public.png')).toEqual({
        status: 200,
        bytes
      })
      // A file outside the public directory, served by serveStaticMiddleware
      expect(await fetchBytesFromServiceWorker('/initial-binary/pixel.png')).toEqual({
        status: 200,
        bytes
      })
    })

    test('reads them in the Web Worker with the same bytes', async () => {
      // The Web Worker inlines the file from its own virtual filesystem
      const inlined = await fetchFromServiceWorker('/initial-binary/pixel.png?import&inline')
      const base64 = inlined.body.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)?.[1]
      expect(base64).toBeDefined()
      expect([...Buffer.from(base64!, 'base64')]).toEqual(bytes)
    }, 30000)

    test("keeps the caller's buffers usable", async () => {
      const buffers = await page.evaluate(() =>
        Object.entries((window as any).__initialBinaryFiles__ as Record<string, ArrayBuffer>).map(
          ([path, buffer]) => ({
            path,
            byteLength: buffer.byteLength,
            bytes: [...new Uint8Array(buffer)]
          })
        )
      )
      expect(buffers).toEqual([
        { path: '/public/initial-public.png', byteLength: bytes.length, bytes },
        { path: '/initial-binary/pixel.png', byteLength: bytes.length, bytes }
      ])
    })
  })

  describe('preview sessions', () => {
    test('keeps multiple panes alive with targeted reload and unmount', async () => {
      const dangerousMarker = '</script>\u2028\u2029'

      await page.evaluate(source => {
        return (window as any).__vrowzer__.updateFile('/main.js', source)
      }, createMultiSessionSource('multi-1'))

      await expect
        .poll(
          () =>
            page.evaluate(() =>
              document
                .querySelector('#preview-container iframe')
                ?.contentDocument?.querySelector('[data-revision]')
                ?.getAttribute('data-revision')
            ),
          { timeout: 15_000 }
        )
        .toBe('multi-1')

      const mountResult = await page.evaluate(marker => {
        const vrowzer = (window as any).__vrowzer__
        const tabletContainer = document.createElement('div')
        tabletContainer.id = 'preview-tablet'
        const mobileContainer = document.createElement('div')
        mobileContainer.id = 'preview-mobile'
        const duplicateContainer = document.createElement('div')
        duplicateContainer.id = 'preview-duplicate'
        document.body.append(tabletContainer, mobileContainer, duplicateContainer)

        const tablet = vrowzer.mount(tabletContainer, {
          id: 'tablet',
          params: { viewport: 'tablet' }
        })
        const mobile = vrowzer.mount(mobileContainer, {
          id: 'mobile',
          params: { marker, viewport: 'mobile' }
        })
        const duplicate = vrowzer.mount(duplicateContainer, {
          id: 'mobile',
          params: { viewport: 'duplicate' }
        })
        ;(window as any).__vrowzerMultiSessions = { mobile, tablet }

        return {
          duplicateIsSame: duplicate === mobile,
          duplicateIframeCount: duplicateContainer.querySelectorAll('iframe').length,
          sessionIds: vrowzer.sessions().map((session: { id: string }) => session.id)
        }
      }, dangerousMarker)

      expect(mountResult).toEqual({
        duplicateIsSame: true,
        duplicateIframeCount: 0,
        sessionIds: ['preview', 'tablet', 'mobile']
      })

      await page.waitForFunction(
        () =>
          ['preview-container', 'preview-tablet', 'preview-mobile'].every(containerId =>
            document
              .querySelector(`#${containerId} iframe`)
              ?.contentDocument?.querySelector('[data-revision="multi-1"]')
          ),
        undefined,
        { timeout: 30_000 }
      )

      const contexts = await page.evaluate(() =>
        ['preview-container', 'preview-tablet', 'preview-mobile'].map(containerId => {
          const iframe = document.querySelector(
            `#${containerId} iframe`
          ) as HTMLIFrameElement | null
          const iframeWindow = iframe?.contentWindow as any
          return {
            captured: iframeWindow?.__vrowzerContextAtScriptStart,
            current: iframeWindow?.__VROWZER_PREVIEW__,
            dataset: iframe?.contentDocument?.documentElement.dataset.vrowzerPreviewId,
            frozen: Object.isFrozen(iframeWindow?.__VROWZER_PREVIEW__),
            paramsFrozen: Object.isFrozen(iframeWindow?.__VROWZER_PREVIEW__?.params)
          }
        })
      )

      expect(contexts).toEqual([
        {
          captured: { id: 'preview', params: { viewport: 'primary' } },
          current: { id: 'preview', params: { viewport: 'primary' } },
          dataset: 'preview',
          frozen: true,
          paramsFrozen: true
        },
        {
          captured: { id: 'tablet', params: { viewport: 'tablet' } },
          current: { id: 'tablet', params: { viewport: 'tablet' } },
          dataset: 'tablet',
          frozen: true,
          paramsFrozen: true
        },
        {
          captured: {
            id: 'mobile',
            params: { marker: dangerousMarker, viewport: 'mobile' }
          },
          current: {
            id: 'mobile',
            params: { marker: dangerousMarker, viewport: 'mobile' }
          },
          dataset: 'mobile',
          frozen: true,
          paramsFrozen: true
        }
      ])
      const clientIdsBeforeReload = await waitForHmrClientCount(3)
      expect(new Set(clientIdsBeforeReload).size).toBe(3)

      await page.evaluate(source => {
        return (window as any).__vrowzer__.updateFile('/main.js', source)
      }, createMultiSessionSource('multi-2'))

      await page.waitForFunction(
        () =>
          ['preview-container', 'preview-tablet', 'preview-mobile'].every(containerId =>
            document
              .querySelector(`#${containerId} iframe`)
              ?.contentDocument?.querySelector('[data-revision="multi-2"]')
          ),
        undefined,
        { timeout: 30_000 }
      )

      const tokensBeforeReload = (await page.evaluate(() =>
        Object.fromEntries(
          ['preview-container', 'preview-tablet', 'preview-mobile'].map(containerId => {
            const iframe = document.querySelector(
              `#${containerId} iframe`
            ) as HTMLIFrameElement | null
            return [containerId, (iframe?.contentWindow as any)?.__vrowzerBootToken]
          })
        )
      )) as Record<string, string>

      await page.evaluate(() => {
        ;(window as any).__vrowzerMultiSessions.mobile.reload()
      })

      await expect
        .poll(
          () =>
            page.evaluate(previousToken => {
              const iframe = document.querySelector(
                '#preview-mobile iframe'
              ) as HTMLIFrameElement | null
              return {
                revision: iframe?.contentDocument
                  ?.querySelector('[data-revision]')
                  ?.getAttribute('data-revision'),
                tokenChanged: (iframe?.contentWindow as any)?.__vrowzerBootToken !== previousToken
              }
            }, tokensBeforeReload['preview-mobile']),
          { timeout: 30_000 }
        )
        .toEqual({
          revision: 'multi-2',
          tokenChanged: true
        })

      const tokensAfterReload = (await page.evaluate(() =>
        Object.fromEntries(
          ['preview-container', 'preview-tablet', 'preview-mobile'].map(containerId => {
            const iframe = document.querySelector(
              `#${containerId} iframe`
            ) as HTMLIFrameElement | null
            return [containerId, (iframe?.contentWindow as any)?.__vrowzerBootToken]
          })
        )
      )) as Record<string, string>
      expect(tokensAfterReload['preview-container']).toBe(tokensBeforeReload['preview-container'])
      expect(tokensAfterReload['preview-tablet']).toBe(tokensBeforeReload['preview-tablet'])
      expect(tokensAfterReload['preview-mobile']).not.toBe(tokensBeforeReload['preview-mobile'])
      const clientIdsAfterReload = await waitForHmrClientCount(3)
      expect(new Set(clientIdsAfterReload).size).toBe(3)
      expect(
        clientIdsAfterReload.filter(clientId => clientIdsBeforeReload.includes(clientId))
      ).toHaveLength(2)

      await page.evaluate(() => {
        const vrowzer = (window as any).__vrowzer__
        const sessions = (window as any).__vrowzerMultiSessions
        sessions.staleTablet = sessions.tablet
        vrowzer.unmount('tablet')
      })

      expect(
        await page.evaluate(() => ({
          iframeCount: document.querySelectorAll('#preview-tablet iframe').length,
          sessionIds: (window as any).__vrowzer__
            .sessions()
            .map((session: { id: string }) => session.id)
        }))
      ).toEqual({ iframeCount: 0, sessionIds: ['preview', 'mobile'] })
      expect(await waitForHmrClientCount(2)).toHaveLength(2)

      await page.evaluate(source => {
        return (window as any).__vrowzer__.updateFile('/main.js', source)
      }, createMultiSessionSource('multi-3'))

      await page.waitForFunction(
        () =>
          ['preview-container', 'preview-mobile'].every(containerId =>
            document
              .querySelector(`#${containerId} iframe`)
              ?.contentDocument?.querySelector('[data-revision="multi-3"]')
          ),
        undefined,
        { timeout: 30_000 }
      )

      await page.evaluate(() => {
        const vrowzer = (window as any).__vrowzer__
        const sessions = (window as any).__vrowzerMultiSessions
        sessions.tablet = vrowzer.mount(document.getElementById('preview-tablet'), {
          id: 'tablet',
          params: { viewport: 'tablet-recreated' }
        })
      })

      await page.waitForFunction(
        () =>
          document
            .querySelector('#preview-tablet iframe')
            ?.contentDocument?.querySelector('[data-revision="multi-3"]'),
        undefined,
        { timeout: 30_000 }
      )

      const staleResult = await page.evaluate(() => {
        const vrowzer = (window as any).__vrowzer__
        const sessions = (window as any).__vrowzerMultiSessions
        sessions.staleTablet.reload()
        sessions.staleTablet.unmount()
        vrowzer.reloadPreview(sessions.staleTablet)
        vrowzer.unmount(sessions.staleTablet)
        return {
          currentPreserved: vrowzer.getSession('tablet') === sessions.tablet,
          iframeCount: document.querySelectorAll('#preview-tablet iframe').length
        }
      })

      expect(staleResult).toEqual({ currentPreserved: true, iframeCount: 1 })
      expect(await waitForHmrClientCount(3)).toHaveLength(3)

      await page.evaluate(() => {
        const vrowzer = (window as any).__vrowzer__
        vrowzer.unmount('tablet')
        vrowzer.unmount((window as any).__vrowzerMultiSessions.mobile)
        document.getElementById('preview-tablet')?.remove()
        document.getElementById('preview-mobile')?.remove()
        document.getElementById('preview-duplicate')?.remove()
        delete (window as any).__vrowzerMultiSessions
      })

      expect(
        await page.evaluate(() =>
          (window as any).__vrowzer__.sessions().map((session: { id: string }) => session.id)
        )
      ).toEqual(['preview'])
      expect(await waitForHmrClientCount(1)).toHaveLength(1)
    }, 120_000)
  })

  describe('preview load errors', () => {
    interface LoadErrorReport {
      id: string
      stage: string
      message: string
      url?: string
      status?: number
      error?: { name: string; message: string }
    }

    // Every session loads the same preview URL, so breaking `/index.html` would fail all of them.
    // Instead, these tests point one session's bootstrap at another URL right after mount().
    // The bootstrap embeds the preview URL as a JSON string, and the load token is kept,
    // so the host still accepts the reports from the replaced document.
    const PREVIEW_URL_LITERAL = JSON.stringify('/__preview__/')
    const UNREACHABLE_URL = 'http://127.0.0.1:9/'
    const sessionIds: string[] = []
    const fixtureFiles: Record<string, string> = {}

    async function mountSession(id: string, previewUrl?: string): Promise<void> {
      sessionIds.push(id)
      await page.evaluate(
        ({ id, previewUrl, previewUrlLiteral }) => {
          const container = document.createElement('div')
          container.id = `load-error-${id}`
          document.body.append(container)
          const session = (window as any).__vrowzer__.mount(container, { id })
          if (previewUrl !== undefined) {
            session.iframe.srcdoc = session.iframe.srcdoc.replaceAll(
              previewUrlLiteral,
              JSON.stringify(previewUrl)
            )
          }
        },
        { id, previewUrl, previewUrlLiteral: PREVIEW_URL_LITERAL }
      )
    }

    async function readLoadErrors(id: string): Promise<LoadErrorReport[]> {
      return page.evaluate(
        sessionId =>
          ((window as any).__previewLoadErrors as LoadErrorReport[]).filter(
            info => info.id === sessionId
          ),
        id
      )
    }

    async function waitForLoadError(id: string): Promise<LoadErrorReport> {
      let reports: LoadErrorReport[] = []
      await expect
        .poll(
          async () => {
            reports = await readLoadErrors(id)
            return reports.length
          },
          { timeout: 15_000 }
        )
        .toBeGreaterThan(0)
      return reports[0]!
    }

    async function waitForScriptGlobal(id: string, name: string): Promise<void> {
      await page.waitForFunction(
        ({ id, name }) =>
          (document.querySelector(`#load-error-${id} iframe`) as HTMLIFrameElement | null)
            ?.contentWindow?.[name as keyof Window] !== undefined,
        { id, name },
        { timeout: 30_000 }
      )
    }

    let fixturesReady: Promise<void> | undefined

    // expect.poll() cannot run in hooks, so each test awaits this shared preparation
    function prepareFixtures(): Promise<void> {
      fixturesReady ??= addFixtures()
      return fixturesReady
    }

    async function addFixtures(): Promise<void> {
      Object.assign(fixtureFiles, {
        '/load-error-missing-entry.html':
          '<!doctype html>\n<script type="module" src="/load-error-missing.js"></script>\n',
        '/load-error-graph.html':
          '<!doctype html>\n<script type="module" src="/load-error-entry.js"></script>\n',
        '/load-error-entry.js': "import './load-error-broken.ts'\n",
        '/load-error-broken.ts': 'export const = 1\n',
        '/load-error-classic.html': `<!doctype html>\n<script src="${crossOriginAssetServerUrl}/load-error-missing-classic.js"></script>\n`,
        '/load-error-fixable.html':
          '<!doctype html>\n<script type="module" src="/load-error-fixable.js"></script>\n'
      })
      await addPreviewFiles(fixtureFiles)
      // Missing files fall back to index.html, so wait until each fixture is served
      await waitForPreviewBodyContaining('/load-error-missing-entry.html', 'load-error-missing.js')
      await waitForPreviewBodyContaining('/load-error-graph.html', 'load-error-entry.js')
      await waitForPreviewBodyContaining(
        '/load-error-classic.html',
        'load-error-missing-classic.js'
      )
      await waitForPreviewBodyContaining('/load-error-fixable.html', 'load-error-fixable.js')
      await waitForPreviewBodyContaining('/load-error-entry.js', 'load-error-broken.ts')
      await waitForPreviewResponse('/load-error-broken.ts', 500)

      await page.evaluate(() => {
        const reports: unknown[] = []
        ;(window as any).__previewLoadErrors = reports
        ;(window as any).__stopPreviewLoadErrors = (window as any).__vrowzer__.on(
          'previewLoadError',
          (info: unknown) => {
            reports.push(info)
          }
        )
      })
    }

    afterAll(async () => {
      await page.evaluate(
        async ({ ids, paths }) => {
          const vrowzer = (window as any).__vrowzer__
          for (const id of ids) {
            vrowzer.unmount(id)
            document.getElementById(`load-error-${id}`)?.remove()
          }
          ;(window as any).__stopPreviewLoadErrors?.()
          delete (window as any).__previewLoadErrors
          delete (window as any).__stopPreviewLoadErrors
          await Promise.all(paths.map((path: string) => vrowzer.deleteFile(path)))
        },
        { ids: sessionIds, paths: Object.keys(fixtureFiles) }
      )

      expect(
        await page.evaluate(() =>
          (window as any).__vrowzer__.sessions().map((session: { id: string }) => session.id)
        )
      ).toEqual(['preview'])
    })

    test('reports an error status of the preview HTML', async () => {
      await prepareFixtures()
      await mountSession('html-status', '/__preview__/load-error-broken.ts')

      const report = await waitForLoadError('html-status')

      expect(report).toMatchObject({
        id: 'html-status',
        stage: 'html',
        status: 500,
        url: `${serverUrl}/__preview__/load-error-broken.ts`
      })
      expect(report.message).toContain('500')
    })

    test('reports a missing preview HTML once with 404', async () => {
      await prepareFixtures()
      // The SPA fallback answers other missing paths with index.html, and removing index.html would
      // break the other sessions. The fallback skips /favicon.ico, so its request ends in a 404.
      await mountSession('html-missing', '/__preview__/favicon.ico')

      const report = await waitForLoadError('html-missing')

      expect(report).toMatchObject({ id: 'html-missing', stage: 'html', status: 404 })
      // A page that reloads the preview, such as the host's "Waiting for Service Worker..." page,
      // would report the error again every second
      await new Promise(resolve => setTimeout(resolve, 2500))
      expect(await readLoadErrors('html-missing')).toHaveLength(1)
    })

    test('reports a rejected fetch of the preview HTML', async () => {
      await prepareFixtures()
      await mountSession('html-fetch', UNREACHABLE_URL)

      const report = await waitForLoadError('html-fetch')

      expect(report).toMatchObject({
        id: 'html-fetch',
        stage: 'html',
        url: UNREACHABLE_URL,
        error: { name: 'TypeError' }
      })
      expect(report.status).toBeUndefined()
      expect(report.message.length).toBeGreaterThan(0)
    })

    test('reports a missing entry module', async () => {
      await prepareFixtures()
      await mountSession('missing-entry', '/__preview__/load-error-missing-entry.html')

      const report = await waitForLoadError('missing-entry')

      expect(report).toMatchObject({
        id: 'missing-entry',
        stage: 'script',
        url: `${serverUrl}/__preview__/load-error-missing.js`
      })
    })

    test('reports a module graph that fails to load', async () => {
      await prepareFixtures()
      await mountSession('broken-graph', '/__preview__/load-error-graph.html')

      const report = await waitForLoadError('broken-graph')

      expect(report).toMatchObject({
        id: 'broken-graph',
        stage: 'script',
        url: `${serverUrl}/__preview__/load-error-entry.js`
      })
    })

    test('reports a classic script that fails to load', async () => {
      await prepareFixtures()
      await mountSession('classic', '/__preview__/load-error-classic.html')

      const report = await waitForLoadError('classic')

      expect(report).toMatchObject({
        id: 'classic',
        stage: 'script',
        url: `${crossOriginAssetServerUrl}/load-error-missing-classic.js`
      })
    })

    test('identifies only the session that failed', async () => {
      await prepareFixtures()
      await mountSession('healthy')
      await mountSession('failing', UNREACHABLE_URL)

      await waitForLoadError('failing')
      // Both the playground's main.js and createMultiSessionSource() set this global
      await waitForScriptGlobal('healthy', '__vrowzerContextAtScriptStart')

      expect(await readLoadErrors('healthy')).toEqual([])
    })

    test('loads after the input is fixed and the session reloads', async () => {
      await prepareFixtures()
      await mountSession('fixable', '/__preview__/load-error-fixable.html')
      await waitForLoadError('fixable')

      fixtureFiles['/load-error-fixable.js'] = 'globalThis.__vrowzerLoadErrorFixed = true\n'
      await addPreviewFiles({ '/load-error-fixable.js': fixtureFiles['/load-error-fixable.js'] })
      await waitForPreviewBodyContaining('/load-error-fixable.js', '__vrowzerLoadErrorFixed')
      await page.evaluate(
        ({ previewUrlLiteral }) => {
          const session = (window as any).__vrowzer__.getSession('fixable')
          // reload() renews the load token; point the new document at the same fixture
          session.reload()
          session.iframe.srcdoc = session.iframe.srcdoc.replaceAll(
            previewUrlLiteral,
            JSON.stringify('/__preview__/load-error-fixable.html')
          )
        },
        { previewUrlLiteral: PREVIEW_URL_LITERAL }
      )

      await waitForScriptGlobal('fixable', '__vrowzerLoadErrorFixed')
      expect(await readLoadErrors('fixable')).toHaveLength(1)
    })
  })

  describe('Service Worker', () => {
    test('Service Worker is registered and active', async () => {
      const swState = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration('/')
        return registration?.active?.state
      })

      expect(swState).toBe('activated')
    })

    test.skipIf(CUSTOM_SERVICE_WORKER_READY_TIMEOUT === undefined)(
      'applies a custom Service Worker ready timeout',
      async () => {
        const context = await browser.newContext()
        const timeoutPage = await context.newPage()
        const consoleLogs: string[] = []
        timeoutPage.on('console', message => consoleLogs.push(message.text()))

        try {
          await timeoutPage.goto(
            `${serverUrl}?serviceWorkerReadyTimeout=${CUSTOM_SERVICE_WORKER_READY_TIMEOUT}`
          )
          await timeoutPage.waitForFunction(
            () => document.getElementById('status')?.textContent === 'Failed to initialize',
            undefined,
            { timeout: 10_000 }
          )

          expect(consoleLogs).toContainEqual(
            expect.stringContaining(
              `Service Worker controller did not become ready within ${CUSTOM_SERVICE_WORKER_READY_TIMEOUT}ms`
            )
          )
        } finally {
          await context.close()
        }
      }
    )
  })

  describe('fetch routing', () => {
    test('leaves cross-origin images to the browser network path', async () => {
      expect(await page.evaluate(() => crossOriginIsolated)).toBe(true)

      const requestUrl = `${crossOriginAssetServerUrl}/pixel.png?probe=${Date.now()}`
      const { result, response } = await captureResponse(requestUrl, () =>
        page.evaluate(
          url =>
            new Promise<'load' | 'error'>(resolve => {
              const image = new Image()
              image.hidden = true
              image.onload = () => {
                image.remove()
                resolve('load')
              }
              image.onerror = () => {
                image.remove()
                resolve('error')
              }
              document.body.append(image)
              image.src = url
            }),
          requestUrl
        )
      )

      expect(result).toBe('load')
      expect(response?.status()).toBe(200)
      expect(response?.fromServiceWorker()).toBe(false)
    })

    test('leaves same-origin requests outside basePath to the browser network path', async () => {
      const requestUrl = `${serverUrl}${HOST_FETCH_PROBE_PATH}?probe=${Date.now()}`
      const { result, response } = await captureResponse(requestUrl, () =>
        page.evaluate(async url => (await fetch(url)).text(), requestUrl)
      )

      expect(result).toBe('host-owned')
      expect(response?.status()).toBe(200)
      expect(response?.fromServiceWorker()).toBe(false)
    })

    test('keeps same-origin preview files on the Service Worker path', async () => {
      const filePath = '/fetch-routing-preview-owned.js'
      const content = 'export const routingProbe = "preview-owned"'
      await addPreviewFiles({ [filePath]: content })
      await waitForPreviewBodyContaining(`${filePath}?import`, 'preview-owned')

      const requestUrl = `${serverUrl}/__preview__${filePath}?import&probe=${Date.now()}`
      const { result, response } = await captureResponse(requestUrl, () =>
        page.evaluate(async url => (await fetch(url)).text(), requestUrl)
      )

      expect(result).toContain('preview-owned')
      expect(response?.status()).toBe(200)
      expect(response?.fromServiceWorker()).toBe(true)
    })

    test('answers missing files within basePath with 404 without asking the host', async () => {
      const hostRequestCount = hostPreviewRequests.length

      const responses = await page.evaluate(async () => {
        const read = async (path: string, init?: RequestInit) => {
          const response = await fetch(path, init)
          return { status: response.status, body: await response.text() }
        }
        return {
          narrowAccept: await read('/__preview__/missing-files/data.json', {
            headers: { Accept: 'application/json' }
          }),
          post: await read('/__preview__/missing-files/data.json', { method: 'POST', body: '{}' }),
          favicon: await read('/__preview__/favicon.ico')
        }
      })

      // The SPA fallback does not answer these requests, so they end in the 404 handler
      expect(responses).toEqual({
        narrowAccept: { status: 404, body: '' },
        post: { status: 404, body: '' },
        favicon: { status: 404, body: '' }
      })
      expect(hostPreviewRequests.slice(hostRequestCount)).toEqual([])
    })
  })

  describe('error responses', () => {
    test("returns Vite's error page when a module fails to transform", async () => {
      const filePath = '/sw-error-handler-broken.ts'
      await addPreviewFiles({ [filePath]: 'export const = 1\n' })

      try {
        // index.html (200, via the SPA fallback) until the file reaches the Workers,
        // then 500 from the failed transform
        const response = await waitForPreviewResponse(filePath, 500)

        expect(response.body).toContain('<!DOCTYPE html>')
        expect(response.body).toContain('<title>Error</title>')
        expect(response.body).toContain(filePath)
      } finally {
        await page.evaluate(path => {
          return (window as any).__vrowzer__.deleteFile(path)
        }, filePath)
      }
    })
  })

  describe('filesystem security', () => {
    const deniedFiles = {
      '/.env': 'ENV_SECRET_CANARY',
      '/.npmrc': 'NPMRC_SECRET_CANARY',
      '/.yarnrc.yml': 'YARNRC_SECRET_CANARY',
      '/secret.key': 'PRIVATE_KEY_SECRET_CANARY'
    }
    const staticCases = [
      {
        name: 'denies .npmrc through the static path',
        requestPath: '/.npmrc',
        canary: deniedFiles['/.npmrc']
      },
      {
        name: 'denies .npmrc through the /@fs/ path',
        requestPath: '/@fs/.npmrc',
        canary: deniedFiles['/.npmrc']
      },
      {
        name: 'denies .yarnrc.yml through the static path',
        requestPath: '/.yarnrc.yml',
        canary: deniedFiles['/.yarnrc.yml']
      },
      {
        name: 'denies .yarnrc.yml through the /@fs/ path',
        requestPath: '/@fs/.yarnrc.yml',
        canary: deniedFiles['/.yarnrc.yml']
      },
      {
        name: 'denies .key through the static path',
        requestPath: '/secret.key',
        canary: deniedFiles['/secret.key']
      },
      {
        name: 'denies .key through the /@fs/ path',
        requestPath: '/@fs/secret.key',
        canary: deniedFiles['/secret.key']
      }
    ]
    const transformQueryCases = [
      {
        name: 'raw query before import',
        filePath: '/.npmrc',
        query: '?raw&import',
        canary: deniedFiles['/.npmrc']
      },
      {
        name: 'import before raw query',
        filePath: '/.npmrc',
        query: '?import&raw',
        canary: deniedFiles['/.npmrc']
      },
      {
        name: 'url query',
        filePath: '/.yarnrc.yml',
        query: '?url&import',
        canary: deniedFiles['/.yarnrc.yml']
      },
      {
        name: 'inline query',
        filePath: '/secret.key',
        query: '?inline&import',
        canary: deniedFiles['/secret.key']
      },
      {
        name: 'SVG-like query',
        filePath: '/.env',
        query: '?.svg?import',
        canary: deniedFiles['/.env']
      }
    ]
    const transformCases = [
      { name: 'the normal path', prefix: '' },
      { name: 'the /@fs/ path', prefix: '/@fs' }
    ].flatMap(({ name: routeName, prefix }) =>
      transformQueryCases.map(({ name, filePath, query, canary }) => ({
        name: `denies ${name} through ${routeName}`,
        requestPath: `${prefix}${filePath}${query}`,
        canary
      }))
    )

    beforeAll(async () => {
      await addPreviewFiles(deniedFiles)
    })

    test.each(staticCases)('$name', async ({ requestPath, canary }) => {
      const response = await waitForPreviewResponse(requestPath, 403)
      expect(response.body).toContain('403 Restricted')
      expect(response.body).not.toContain(canary)
    })

    test.each(transformCases)('$name', async ({ requestPath, canary }) => {
      const response = await waitForPreviewResponse(requestPath, 403)
      expect(response.body).toContain('403 Restricted')
      expect(response.body).not.toContain(canary)
    })
  })

  describe('dependency sourcemap security', () => {
    const sourceCanary = 'PROJECT_SOURCE_SECRET_CANARY'
    const externalMapCanary = 'PROJECT_MAP_SECRET_CANARY'
    const inlineDependencyPath = '/node_modules/vrowzer-malicious-inline/index.js'
    const externalDependencyPath = '/node_modules/vrowzer-malicious-external/index.js'
    const inlineMap: SourceMapPayload = {
      version: 3,
      sources: ['../../project-secret.ts'],
      sourcesContent: [null],
      names: [],
      mappings: 'AAAA'
    }
    const externalMap: SourceMapPayload = {
      version: 3,
      sources: ['index.ts'],
      sourcesContent: [externalMapCanary],
      names: [],
      mappings: 'AAAA'
    }

    beforeAll(async () => {
      await addPreviewFiles({
        '/project-secret.ts': sourceCanary,
        '/project-secret.map': JSON.stringify(externalMap),
        '/node_modules/vrowzer-malicious-inline/package.json': JSON.stringify({
          name: 'vrowzer-malicious-inline',
          version: '0.0.0',
          type: 'module'
        }),
        [inlineDependencyPath]: [
          'export const value = "inline"',
          createInlineSourceMapComment(inlineMap)
        ].join('\n'),
        '/node_modules/vrowzer-malicious-external/package.json': JSON.stringify({
          name: 'vrowzer-malicious-external',
          version: '0.0.0',
          type: 'module'
        }),
        [externalDependencyPath]: [
          'export const value = "external"',
          '//# sourceMappingURL=../../project-secret.map'
        ].join('\n')
      })
    })

    test('does not inject package-external source content into an inline dependency map', async () => {
      await waitForPreviewBodyContaining('/project-secret.ts?raw&import', sourceCanary)

      const response = await waitForPreviewResponse(`${inlineDependencyPath}?import`, 200)
      const responseMap = extractInlineSourceMap(response.body)

      expect(responseMap.sourcesContent).toEqual([null])
      expect(JSON.stringify(responseMap)).not.toContain(sourceCanary)
    })

    test('does not load a package-external sourcemap file', async () => {
      await waitForPreviewBodyContaining('/project-secret.map', externalMapCanary)

      const response = await waitForPreviewResponse(`${externalDependencyPath}?import`, 200)
      const responseMap = extractInlineSourceMap(response.body)

      expect(JSON.stringify(responseMap)).not.toContain(externalMapCanary)
    })
  })

  describe('?raw sourcemaps', () => {
    test('does not inject a fallback sourcemap', async () => {
      const rawContent = ['first line', 'second line', 'third line', ''].join('\n')

      await addPreviewFiles({
        '/raw-sourcemap/content.txt': rawContent
      })

      const response = await waitForPreviewBodyContaining(
        '/raw-sourcemap/content.txt?raw&import',
        `export default ${JSON.stringify(rawContent)}`
      )

      expect(response.status).toBe(200)
      expect(response.body).not.toContain('sourceMappingURL=data:application/json;base64,')
    })
  })

  describe('trailing slash HTML paths', () => {
    test('pre-transforms relative modules from the trailing slash directory', async () => {
      await addPreviewFiles({
        '/trailing-slash-test.js': `
import warmupUrls from 'virtual:vrowzer-test-trailing-slash'
globalThis.__vrowzerTrailingSlashWarmupUrls = warmupUrls
`,
        '/trailing-slash/dir/filename.js': 'export const filename = true',
        '/trailing-slash/other.js': 'export const other = true'
      })

      await waitForPreviewBodyContaining(
        '/trailing-slash/dir/filename.js?import',
        'filename = true'
      )
      await waitForPreviewBodyContaining('/trailing-slash/other.js?import', 'other = true')

      await page.evaluate(() => {
        const iframe = document.querySelector(
          '#preview-container iframe'
        ) as HTMLIFrameElement | null
        const iframeDocument = iframe?.contentDocument
        if (!iframeDocument) {
          throw new Error('Preview iframe is not available')
        }

        const script = iframeDocument.createElement('script')
        script.type = 'module'
        script.src = '/__preview__/trailing-slash-test.js'
        iframeDocument.head.append(script)
      })

      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const iframe = document.querySelector(
                '#preview-container iframe'
              ) as HTMLIFrameElement | null
              return (iframe?.contentWindow as any)?.__vrowzerTrailingSlashWarmupUrls
            }),
          { timeout: 15_000 }
        )
        .toBeTruthy()

      const warmupUrls = await page.evaluate(() => {
        const iframe = document.querySelector(
          '#preview-container iframe'
        ) as HTMLIFrameElement | null
        return (iframe?.contentWindow as any)?.__vrowzerTrailingSlashWarmupUrls
      })

      expect(warmupUrls).toEqual(['/trailing-slash/dir/filename.js', '/trailing-slash/other.js'])
    })
  })

  describe('/@fs/ HTML proxy cache', () => {
    test('loads inline modules from /@fs/ and root HTML paths', async () => {
      const inlineModuleHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>HTML proxy</title>
  </head>
  <body>
    <script type="module">
      export const marker = 'inline proxy loaded'
    </script>
  </body>
</html>`

      await addPreviewFiles({
        '/fs-html-proxy-test.js': `
import proxyUrls from 'virtual:vrowzer-test-fs-html-proxy'

const results = {}
for (const [name, url] of Object.entries(proxyUrls)) {
  try {
    const module = await import(/* @vite-ignore */ url)
    results[name] = { marker: module.marker }
  } catch (error) {
    results[name] = {
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
globalThis.__vrowzerFsHtmlProxyResults = results
`,
        '/fs-html-proxy/fs.html': inlineModuleHtml,
        '/fs-html-proxy/root.html': inlineModuleHtml,
        '/fs-html-proxy/sentinel.js': 'export const sentinel = true'
      })

      await waitForPreviewBodyContaining('/fs-html-proxy/sentinel.js?import', 'sentinel = true')

      await page.evaluate(() => {
        const iframe = document.querySelector(
          '#preview-container iframe'
        ) as HTMLIFrameElement | null
        const iframeDocument = iframe?.contentDocument
        if (!iframeDocument) {
          throw new Error('Preview iframe is not available')
        }

        const script = iframeDocument.createElement('script')
        script.type = 'module'
        script.src = '/__preview__/fs-html-proxy-test.js'
        iframeDocument.head.append(script)
      })

      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const iframe = document.querySelector(
                '#preview-container iframe'
              ) as HTMLIFrameElement | null
              return (iframe?.contentWindow as any)?.__vrowzerFsHtmlProxyResults
            }),
          { timeout: 15_000 }
        )
        .toBeTruthy()

      const results = await page.evaluate(() => {
        const iframe = document.querySelector(
          '#preview-container iframe'
        ) as HTMLIFrameElement | null
        return (iframe?.contentWindow as any)?.__vrowzerFsHtmlProxyResults
      })

      expect(results).toEqual({
        fsPath: { marker: 'inline proxy loaded' },
        rootPath: { marker: 'inline proxy loaded' }
      })
    })
  })

  describe('PostCSS URL rewriting', () => {
    test('rewrites URLs injected by a OnceExit plugin', async () => {
      await addPreviewFiles({
        '/postcss-once-exit/entry.css': '@inject-url-once-exit;',
        '/postcss-once-exit/injected-source/injected.css': '',
        '/postcss-once-exit/injected-source/injected-bg.png': 'injected background',
        '/postcss-once-exit/sentinel.js': 'export const sentinel = true'
      })

      await waitForPreviewBodyContaining('/postcss-once-exit/sentinel.js?import', 'sentinel = true')

      const response = await waitForPreviewResponse('/postcss-once-exit/entry.css?direct', 200)

      expect(response.body).toContain('.inject-url-once-exit')
      expect(response.body).toContain('/postcss-once-exit/injected-source/injected-bg.png')
      expect(response.body).not.toContain('url(./injected-bg.png)')
    })
  })

  describe('CSS relative resolution', () => {
    test('rewrites a relative url() with the JavaScript resolver', async () => {
      await addPreviewFiles({
        '/css-resolve-url/entry.css': '.css-resolve-url { background-image: url(./bg.png); }',
        '/css-resolve-url/bg.png': 'css resolve background',
        '/css-resolve-url/sentinel.js': 'export const sentinel = true'
      })

      await waitForPreviewBodyContaining('/css-resolve-url/sentinel.js?import', 'sentinel = true')

      const response = await waitForPreviewResponse('/css-resolve-url/entry.css?direct', 200)

      expect(response.body).toContain('.css-resolve-url')
      expect(response.body).toContain(
        'url(https://assets.vrowzer.test/__preview__/css-resolve-url/bg.png)'
      )
      expect(response.body).not.toContain('url(./bg.png)')
    })

    test('inlines a relative @import with the JavaScript resolver', async () => {
      await addPreviewFiles({
        '/css-resolve-import/entry.css':
          "@import './partial.css';\n.css-resolve-import-entry { color: blue; }",
        '/css-resolve-import/partial.css': '.css-resolve-import-partial { color: red; }',
        '/css-resolve-import/sentinel.js': 'export const sentinel = true'
      })

      await waitForPreviewBodyContaining(
        '/css-resolve-import/sentinel.js?import',
        'sentinel = true'
      )

      const response = await waitForPreviewResponse('/css-resolve-import/entry.css?direct', 200)

      expect(response.body).toContain('.css-resolve-import-partial')
      expect(response.body).toContain('.css-resolve-import-entry')
      expect(response.body).not.toContain('@import')
    })
  })

  describe('JSON imports', () => {
    // Add the files once. Re-adding a JSON file that is already in the module graph
    // triggers a full reload of the preview iframe.
    beforeAll(async () => {
      await addPreviewFiles({
        '/json-import/data.json':
          '{ "name": "vrowzer", "nested": { "value": 1 }, "invalid-key": true }',
        '/json-import/list.json': '[1, 2, 3]',
        '/json-import/entry.js': `
import data, { name, nested } from './data.json'
import list from './list.json'

globalThis.__vrowzerJsonImportResult = { data, name, nested, list }
`
      })
    })

    test('transforms JSON files to ES modules with the native JSON plugin', async () => {
      const data = await waitForPreviewBodyContaining(
        '/json-import/data.json?import',
        'export default'
      )
      expect(data.status).toBe(200)
      expect(data.body).toContain('export const name = "vrowzer";')
      expect(data.body).toContain('export const nested = {"value":1};')
      expect(data.body).toContain('"invalid-key": true')
      expect(data.body).not.toContain('export const invalid')

      const list = await waitForPreviewResponse('/json-import/list.json?import', 200)
      expect(list.body).toContain('export default [1,2,3];')
    })

    test('imports default and named JSON exports in the preview', async () => {
      await waitForPreviewBodyContaining('/json-import/entry.js?import', 'data.json')

      await page.evaluate(() => {
        const iframe = document.querySelector(
          '#preview-container iframe'
        ) as HTMLIFrameElement | null
        const iframeDocument = iframe?.contentDocument
        if (!iframeDocument) {
          throw new Error('Preview iframe is not available')
        }

        const script = iframeDocument.createElement('script')
        script.type = 'module'
        script.src = '/__preview__/json-import/entry.js'
        iframeDocument.head.append(script)
      })

      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const iframe = document.querySelector(
                '#preview-container iframe'
              ) as HTMLIFrameElement | null
              return (iframe?.contentWindow as any)?.__vrowzerJsonImportResult
            }),
          { timeout: 15_000 }
        )
        .toEqual({
          data: { name: 'vrowzer', nested: { value: 1 }, 'invalid-key': true },
          name: 'vrowzer',
          nested: { value: 1 },
          list: [1, 2, 3]
        })
    })
  })

  describe('CSS server.origin', () => {
    test('applies server.origin to public URLs', async () => {
      const expectedUrl = 'https://assets.vrowzer.test/__preview__/server-origin-icon.png'

      await addPreviewFiles({
        '/public/server-origin-icon.png': 'server origin icon',
        '/server-origin/entry.css':
          ".server-origin-public { background-image: url('/server-origin-icon.png'); }"
      })

      const response = await waitForPreviewBodyContaining(
        '/server-origin/entry.css?direct',
        expectedUrl
      )

      expect(response.status).toBe(200)
      expect(response.body).toContain(expectedUrl)
      expect(response.body).not.toContain("url('/__preview__/server-origin-icon.png')")
    })
  })

  describe('all-session teardown', () => {
    test('unmounts every iframe and remounts with the existing runtime', async () => {
      const stateAfterUnmount = await page.evaluate(() => {
        const vrowzer = (window as any).__vrowzer__
        vrowzer.unmount()
        return {
          iframeCount: document.querySelectorAll('#preview-container iframe').length,
          sessionCount: vrowzer.sessions().length
        }
      })

      expect(stateAfterUnmount).toEqual({ iframeCount: 0, sessionCount: 0 })

      await page.evaluate(() => {
        const vrowzer = (window as any).__vrowzer__
        vrowzer.mount(document.getElementById('preview-container'), {
          id: 'remounted',
          params: { viewport: 'remounted' }
        })
      })

      await page.waitForFunction(
        () =>
          document
            .querySelector('#preview-container iframe')
            ?.contentDocument?.querySelector('[data-revision="multi-3"]'),
        undefined,
        { timeout: 30_000 }
      )

      expect(
        await page.evaluate(() =>
          (window as any).__vrowzer__.sessions().map((session: { id: string }) => session.id)
        )
      ).toEqual(['remounted'])
      expect(await waitForHmrClientCount(1)).toHaveLength(1)
    }, 60_000)
  })
})
