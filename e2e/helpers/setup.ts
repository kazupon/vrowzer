/**
 * Shared E2E test setup for vrowzer hosts.
 *
 * Provides `setupHost()` which handles server startup, browser launch,
 * page navigation, and Vrowzer ready wait — common to all E2E host tests.
 */

import { afterAll, beforeAll } from 'vitest'
import { debug, launchBrowser, startServer, waitForVrowzerReady } from './test-utils.ts'

import type { Browser, Page } from '@playwright/test'
import type { PreviewServer, ViteDevServer } from 'vite'

export interface HostContext {
  page: Page
}

/**
 * Set up an E2E host test suite.
 *
 * Call this at the top level of a test file to register `beforeAll`/`afterAll`
 * hooks that start the Vite server, launch the browser, navigate, and wait
 * for Vrowzer to initialize.
 *
 * @param hostDir - Absolute path to the host directory (use `import.meta.dirname`)
 * @returns Context object with `page` (available after `beforeAll` resolves)
 */
export function setupHost(hostDir: string): HostContext {
  let browser: Browser
  let page: Page
  let server: ViteDevServer | PreviewServer

  const ctx: HostContext = {
    get page() {
      return page
    }
  }

  beforeAll(async () => {
    browser = await launchBrowser()

    const result = await startServer(hostDir)
    server = result.server
    const serverUrl = result.serverUrl

    page = await browser.newPage()
    page.on('console', msg => debug(`[browser ${msg.type()}]`, msg.text()))
    page.on('pageerror', err => debug('[browser error]', err.message))

    await page.goto(serverUrl)
    await waitForVrowzerReady(page)
  }, 120000)

  afterAll(async () => {
    await page?.close()
    await browser?.close()
    await server?.close()
  })

  return ctx
}
