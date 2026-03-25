/**
 * E2E test utilities for vrowzer
 *
 * Provides shared constants and helpers used across E2E test hosts.
 */

import { chromium } from '@playwright/test'
import { execSync } from 'node:child_process'
import { build, createServer, preview } from 'vite'

import type { Browser, Page } from '@playwright/test'
import type { PreviewServer, ViteDevServer } from 'vite'

/** Whether running in build mode (VROWZER_TEST_BUILD=1) */
export const isBuild = !!process.env.VROWZER_TEST_BUILD
/** Whether running in serve (dev) mode */
export const isServe = !isBuild

const E2E_DEBUG = process.env.E2E_DEBUG === '1' || process.env.E2E_DEBUG === 'true'
export const debug = (...args: unknown[]) => E2E_DEBUG && console.log('[E2E]', ...args)

export interface TestContext {
  browser: Browser
  page: Page
  server: ViteDevServer | PreviewServer
  serverUrl: string
}

/**
 * Start a Vite server for the given host directory.
 *
 * In serve mode: `createServer()` + `listen()`
 * In build mode: `vite build` + `preview()`
 */
export async function startServer(hostDir: string): Promise<{
  server: ViteDevServer | PreviewServer
  serverUrl: string
}> {
  if (isBuild) {
    debug('Building host...', hostDir)
    execSync('npx vite build --minify false', {
      cwd: hostDir,
      stdio: E2E_DEBUG ? 'inherit' : 'pipe'
    })
    debug('Build complete')

    const server = await preview({
      root: hostDir,
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
    const serverUrl =
      typeof address === 'object' && address ? `http://localhost:${address.port}` : ''
    debug('Preview server started at', serverUrl)
    return { server, serverUrl }
  } else {
    const server = await createServer({
      root: hostDir,
      server: {
        port: 0,
        strictPort: false,
        headers: {
          'Service-Worker-Allowed': '/',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'credentialless'
        }
      }
    })
    await server.listen()
    const serverUrl = server.resolvedUrls!.local[0]!
    debug('Dev server started at', serverUrl)
    return { server, serverUrl }
  }
}

/**
 * Launch a headless Chromium browser.
 */
export async function launchBrowser(): Promise<Browser> {
  const browser = await chromium.launch({ headless: true })
  debug('Browser launched')
  return browser
}

/**
 * Wait for Vrowzer to finish initialization in the page.
 * Resolves when the status text changes from "Initializing..." to "Ready" or "Failed".
 */
export async function waitForVrowzerReady(page: Page, timeout = 60000): Promise<void> {
  await page.waitForFunction(
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
