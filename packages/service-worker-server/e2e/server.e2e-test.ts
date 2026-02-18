/**
 * @vrowser/service-worker-server E2E Tests
 *
 * Comprehensive end-to-end tests for SvcWorkerServer covering:
 * - listen() and 'listening' event
 * - Fetch event handling
 * - close() and 'close' event
 * - claimOnActivate option
 * - Error cases (double listen, invalid handler)
 */

import { spawn } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { getPort } from 'get-port-please'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'

import type { ChildProcess } from 'node:child_process'
import type { Browser, BrowserContext, Page } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageDir = dirname(__dirname)

let BASE_URL: string
let serverProcess: ChildProcess
let browser: Browser

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Start Vite dev server and wait for it to be ready
 */
async function startDevServer(options: {
  cwd: string
  port?: number
  signal?: AbortSignal
}): Promise<{ url: string; process: ChildProcess }> {
  const { cwd, port: preferredPort = 5174, signal } = options

  const port = await getPort({ port: preferredPort })
  const url = `http://localhost:${port}`

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason as Error)
      return
    }

    const childProcess = spawn('npx', ['vite', '--port', String(port)], {
      cwd,
      stdio: 'pipe'
    })
    childProcess.stdout?.pipe(process.stdout)

    let stderrOutput = ''
    let settled = false

    const cleanup = () => {
      settled = true
      signal?.removeEventListener('abort', onAbort)
      clearInterval(pollId)
    }

    const onAbort = () => {
      if (settled) {
        return
      }
      cleanup()
      childProcess.kill()
      reject(
        (signal!.reason ?? new Error(`Aborted${stderrOutput ? `: ${stderrOutput}` : ''}`)) as Error
      )
    }

    signal?.addEventListener('abort', onAbort)

    childProcess.on('error', err => {
      if (settled) {
        return
      }
      cleanup()
      reject(err)
    })

    childProcess.stderr?.on('data', (data: Buffer) => {
      stderrOutput += data.toString()
    })

    childProcess.on('exit', code => {
      if (settled) {
        return
      }
      if (code !== null && code !== 0) {
        cleanup()
        reject(
          new Error(`Process exited with code ${code}${stderrOutput ? `: ${stderrOutput}` : ''}`)
        )
      }
    })

    const pollId = setInterval(async () => {
      if (settled) {
        return
      }
      try {
        // Check if server is responding (any status code means it's up)
        const res = await fetch(`${url}/e2e/server-test.html`)
        if (res.status !== 0) {
          cleanup()
          resolve({ url, process: childProcess })
        }
      } catch {
        // ignore errors - server not ready yet
      }
    }, 100)
  })
}

/**
 * Wait for page status element to match expected value
 */
async function waitForStatus(page: Page, status: string, timeout = 15000): Promise<void> {
  await page.waitForFunction(
    (expectedStatus: string) => document.getElementById('status')?.textContent === expectedStatus,
    status,
    { timeout }
  )
}

/**
 * Wait for the page to be controlled by Service Worker
 */
async function waitForServiceWorkerController(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout })
}

/**
 * Cleanup all service workers
 */
async function cleanupServiceWorkers(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(r => r.unregister()))
  })
}

/**
 * Fetch /api/test endpoint from the Service Worker
 */
async function fetchServerApi(page: Page): Promise<{
  version: string
  listening: boolean
  closed: boolean
  errors: string[]
}> {
  await waitForServiceWorkerController(page)
  return page.evaluate(async () => {
    const response = await fetch('/api/test')
    return response.json()
  })
}

/**
 * Send a message to the Service Worker
 */
async function sendMessageToSW<T>(page: Page, type: string): Promise<T> {
  return page.evaluate(async (msgType: string) => {
    return window.sendMessageToSW<T>(msgType)
  }, type)
}

/**
 * Get controller changes recorded by the page
 */
async function getControllerChanges(
  page: Page
): Promise<Array<{ time: number; controller: string | null }>> {
  return page.evaluate(() => window.testState.controllerChanges)
}

// =============================================================================
// Test Setup
// =============================================================================

beforeAll(async () => {
  const server = await startDevServer({
    cwd: packageDir,
    signal: AbortSignal.timeout(60000)
  })
  BASE_URL = server.url
  serverProcess = server.process
  browser = await chromium.launch()
}, 90000)

afterAll(async () => {
  await browser?.close()
  serverProcess?.kill()
})

// =============================================================================
// listen() and 'listening' event Tests
// =============================================================================

describe('SvcWorkerServer.listen() and listening event', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/e2e/server-test.html`)
    await cleanupServiceWorkers(page)
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('server emits listening event after activation', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/e2e/server-test.html?version=v1`)

    await waitForStatus(page, 'activated')

    // Verify server is listening via API
    const serverState = await fetchServerApi(page)
    expect(serverState.listening).toBe(true)
    expect(serverState.version).toBe('v1')

    await page.close()
  })

  test('fetch handler responds correctly after listen()', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/e2e/server-test.html?version=v1`)

    await waitForStatus(page, 'activated')
    await waitForServiceWorkerController(page)

    // Test echo endpoint
    const echoResponse = await page.evaluate(async () => {
      const response = await fetch('/api/echo', {
        method: 'POST',
        body: 'Hello, Server!'
      })
      return response.json()
    })

    expect(echoResponse.echo).toBe('Hello, Server!')

    await page.close()
  })
})

// =============================================================================
// close() and 'close' event Tests
// =============================================================================

describe('SvcWorkerServer.close() and close event', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/e2e/server-test.html`)
    await cleanupServiceWorkers(page)
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('close() stops fetch handler and emits close event', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/e2e/server-test.html?version=v1`)

    await waitForStatus(page, 'activated')
    await waitForServiceWorkerController(page)

    // Verify server is listening
    let serverState = await fetchServerApi(page)
    expect(serverState.listening).toBe(true)

    // Call close via API endpoint
    await page.evaluate(async () => {
      await fetch('/api/close')
    })

    // Wait a bit for close to complete
    await page.waitForTimeout(100)

    // Get server state via message (since fetch handler is now off)
    const response = await sendMessageToSW<{ type: string; state: typeof serverState }>(
      page,
      'GET_STATE'
    )

    expect(response.state.closed).toBe(true)
    expect(response.state.listening).toBe(false)

    await page.close()
  })

  test('fetch requests fall through after close()', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/e2e/server-test.html?version=v1`)

    await waitForStatus(page, 'activated')
    await waitForServiceWorkerController(page)

    // Close server
    await page.evaluate(async () => {
      await fetch('/api/close')
    })

    await page.waitForTimeout(100)

    // Try to fetch API - should get 404 (falls through to network)
    const fetchResult = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/test')
        return { status: response.status, ok: response.ok }
      } catch (e) {
        return { error: (e as Error).message }
      }
    })

    // Should get 404 because the server closed and the request falls through to network
    expect(fetchResult.status).toBe(404)

    await page.close()
  })
})

// =============================================================================
// claimOnActivate Option Tests
// =============================================================================

describe('claimOnActivate option', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/e2e/server-test.html`)
    await cleanupServiceWorkers(page)
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('claimOnActivate: true causes immediate page control', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/e2e/server-test.html?sw=/e2e-server-sw-claim.js?version=v1`)

    await waitForStatus(page, 'activated')

    // With claimOnActivate: true, the page should be controlled immediately
    const controllerChanges = await getControllerChanges(page)
    expect(controllerChanges.length).toBeGreaterThan(0)
    expect(controllerChanges[0]?.controller).toContain('e2e-server-sw-claim.js')

    // Verify controller is set
    const controllerUrl = await page.evaluate(
      () => navigator.serviceWorker.controller?.scriptURL ?? null
    )
    expect(controllerUrl).toContain('e2e-server-sw-claim.js')

    await page.close()
  })

  test('claimOnActivate: false does not auto-control page', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/e2e/server-test.html?sw=/e2e-server-sw-no-claim.js?version=v1`)

    await waitForStatus(page, 'activated')

    // Without claimOnActivate, controllerchange should not fire
    const controllerChanges = await getControllerChanges(page)
    expect(controllerChanges.length).toBe(0)

    // Controller should be null
    const controllerUrl = await page.evaluate(
      () => navigator.serviceWorker.controller?.scriptURL ?? null
    )
    expect(controllerUrl).toBeNull()

    await page.close()
  })
})

// =============================================================================
// Error Cases Tests
// =============================================================================

describe('Error cases', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/e2e/server-test.html`)
    await cleanupServiceWorkers(page)
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('double listen() emits error event', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/e2e/server-test.html?version=v1`)

    await waitForStatus(page, 'activated')
    await waitForServiceWorkerController(page)

    // Attempt double listen via message
    await sendMessageToSW(page, 'DOUBLE_LISTEN')

    // Wait for error to be recorded
    await page.waitForTimeout(100)

    // Get server state and check for error
    const response = await sendMessageToSW<{ type: string; state: { errors: string[] } }>(
      page,
      'GET_STATE'
    )

    expect(response.state.errors).toContain('Server is already listening')

    await page.close()
  })

  test('error in fetch handler emits error event', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/e2e/server-test.html?version=v1`)

    await waitForStatus(page, 'activated')
    await waitForServiceWorkerController(page)

    // Call endpoint that throws error
    await page.evaluate(async () => {
      try {
        await fetch('/api/error')
      } catch {
        // Expected to fail
      }
    })

    // Wait for error to be recorded
    await page.waitForTimeout(100)

    // Get server state and check for error
    const response = await sendMessageToSW<{ type: string; state: { errors: string[] } }>(
      page,
      'GET_STATE'
    )

    expect(response.state.errors.some(e => e.includes('Intentional test error'))).toBe(true)

    await page.close()
  })
})

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration scenarios', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/e2e/server-test.html`)
    await cleanupServiceWorkers(page)
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('multiple pages share same Service Worker server', async () => {
    const page1 = await context.newPage()
    await page1.goto(`${BASE_URL}/e2e/server-test.html?version=v1`)
    await waitForStatus(page1, 'activated')

    const page2 = await context.newPage()
    await page2.goto(`${BASE_URL}/e2e/server-test.html?version=v1`)
    await waitForStatus(page2, 'activated')

    // Both should be controlled by same SW
    const sw1 = await page1.evaluate(() => navigator.serviceWorker.controller?.scriptURL)
    const sw2 = await page2.evaluate(() => navigator.serviceWorker.controller?.scriptURL)

    expect(sw1).toBeDefined()
    expect(sw1).toBe(sw2)

    await page1.close()
    await page2.close()
  })

  test('server state persists across page navigations', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/e2e/server-test.html?version=v1`)

    await waitForStatus(page, 'activated')
    await waitForServiceWorkerController(page)

    // Get initial state
    const state1 = await fetchServerApi(page)
    expect(state1.version).toBe('v1')

    // Navigate to same page
    await page.goto(`${BASE_URL}/e2e/server-test.html?version=v1`)
    await waitForStatus(page, 'activated')

    // State should persist (same SW instance)
    const state2 = await fetchServerApi(page)
    expect(state2.version).toBe('v1')

    await page.close()
  })
})
