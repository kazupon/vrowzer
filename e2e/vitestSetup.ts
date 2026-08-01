/**
 * Per-test E2E setup for vrowzer.
 *
 * Runs as a vitest setupFile. For each test file:
 * 1. Connects to the shared browser (from globalSetup)
 * 2. Resolves the host directory from the test file path
 * 3. Starts the Vite dev/preview server with COOP/COEP headers
 * 4. Creates a new page, captures console logs and errors
 * 5. Navigates to the server URL and waits for vrowzer "Ready"
 */

import { chromium } from '@playwright/test'
import { dirname } from 'node:path'
import { afterAll, beforeAll, inject } from 'vite-plus/test'
import { build, createServer, preview } from 'vite'

import type { Browser, Page } from '@playwright/test'
import type { PreviewServer, ViteDevServer } from 'vite'

export const isBuild = !!process.env.VROWZER_TEST_BUILD
export const isServe = !isBuild

const E2E_DEBUG = process.env.E2E_DEBUG === '1' || process.env.E2E_DEBUG === 'true'
const debug = (...args: unknown[]) => E2E_DEBUG && console.log('[E2E]', ...args)

// Module-level state, exported for use by test-utils.ts and test files
export let page: Page
export let browser: Browser
export let viteTestUrl: string
export let browserLogs: string[]
export let browserErrors: Error[]

let server: ViteDevServer | PreviewServer

/**
 * Resolve host directory from test file path.
 *
 * e2e/vite-vue/vue-basic.spec.ts → e2e/vite-vue/
 * e2e/playground/hmr/hmr.spec.ts → e2e/playground/hmr/
 */
function resolveHostDir(testPath: string): string {
  return dirname(testPath)
}

/**
 * Start a Vite server for the given host directory.
 */
async function startServer(hostDir: string): Promise<{
  server: ViteDevServer | PreviewServer
  serverUrl: string
}> {
  const headers = {
    'Service-Worker-Allowed': '/',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless'
  }

  if (isBuild) {
    debug('Building host...', hostDir)
    await build({
      root: hostDir,
      build: { minify: false }
    })
    debug('Build complete')

    const srv = await preview({
      root: hostDir,
      preview: { port: 0, strictPort: false, headers }
    })
    const address = srv.httpServer.address()
    const url = typeof address === 'object' && address ? `http://localhost:${address.port}` : ''
    debug('Preview server started at', url)
    return { server: srv, serverUrl: url }
  } else {
    const srv = await createServer({
      root: hostDir,
      server: { port: 0, strictPort: false, headers }
    })
    await srv.listen()
    // Avoid optimizer reloads interrupting Vrowzer's worker handshake.
    await srv.warmupRequest('/index.ts')
    const url = srv.resolvedUrls!.local[0]!
    debug('Dev server started at', url)
    return { server: srv, serverUrl: url }
  }
}

/**
 * Wait for Vrowzer to finish initialization.
 */
async function waitForVrowzerReady(p: Page, timeout = 60000): Promise<void> {
  await p.waitForFunction(
    () => {
      const el =
        document.getElementById('status') ??
        document.querySelector('[data-testid="vrowzer-status"]') ??
        document.querySelector('.status')
      return el?.textContent === 'Ready' || el?.textContent === 'Failed'
    },
    { timeout }
  )
}

beforeAll(async ({}, suite) => {
  const testPath = suite.file!.filepath!
  const hostDir = resolveHostDir(testPath)
  debug('Host directory:', hostDir)

  // Connect to shared browser
  const wsEndpoint = inject<string>('wsEndpoint')
  browser = await chromium.connect(wsEndpoint)
  debug('Connected to shared browser')

  // Start server
  const result = await startServer(hostDir)
  server = result.server
  viteTestUrl = result.serverUrl

  // Create page and capture logs
  browserLogs = []
  browserErrors = []
  page = await browser.newPage()
  page.on('console', msg => {
    browserLogs.push(msg.text())
    debug(`[browser ${msg.type()}]`, msg.text())
  })
  page.on('pageerror', err => {
    browserErrors.push(err)
    debug('[browser error]', err.message)
  })

  // Navigate and wait for vrowzer
  await page.goto(viteTestUrl)
  await waitForVrowzerReady(page)
  debug('Vrowzer ready')
}, 120000)

afterAll(async () => {
  await page?.close()
  await browser?.close()
  await server?.close()
})
