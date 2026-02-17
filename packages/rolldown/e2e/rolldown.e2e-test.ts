/**
 * @vrowser/rolldown E2E Tests
 *
 * Verifies that the pre-bundled rolldown works in a browser environment.
 * Builds a test playground with Vite, serves it with a static server
 * (with COOP/COEP headers for SharedArrayBuffer), then uses Playwright
 * to verify rolldown can bundle code in the browser.
 */

import { chromium } from '@playwright/test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createStaticServer } from './utils/server.ts'

import type { Browser } from '@playwright/test'
import type { StaticServer } from './utils/server.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLAYGROUND_DIR = join(__dirname, 'playground')
const OUTPUT_DIR = join(__dirname, '.output')

const E2E_DEBUG = process.env.E2E_DEBUG === '1' || process.env.E2E_DEBUG === 'true'
const debug = (...args: unknown[]) => E2E_DEBUG && console.log('[E2E]', ...args)

let browser: Browser
let server: StaticServer

beforeAll(async () => {
  // Build playground with Vite
  debug('Building playground...')
  await build({
    root: PLAYGROUND_DIR,
    base: '/',
    logLevel: 'warn',
    build: {
      outDir: OUTPUT_DIR,
      emptyOutDir: true,
      sourcemap: false,
      minify: false,
      rollupOptions: {
        input: join(PLAYGROUND_DIR, 'index.html')
      }
    }
  })
  debug('Build complete')

  // Copy dist files to output (worker.js, WASM binary)
  // These files are loaded at runtime via import.meta.url and can't be bundled by Vite
  const { copyFileSync, mkdirSync } = await import('node:fs')
  const distDir = join(__dirname, '..', 'dist')
  mkdirSync(join(OUTPUT_DIR, 'assets'), { recursive: true })
  copyFileSync(join(distDir, 'worker.js'), join(OUTPUT_DIR, 'assets', 'worker.js'))
  copyFileSync(
    join(distDir, 'rolldown-binding.wasm32-wasi.wasm'),
    join(OUTPUT_DIR, 'assets', 'rolldown-binding.wasm32-wasi.wasm')
  )

  // Start static server with COOP/COEP headers
  server = await createStaticServer(OUTPUT_DIR)
  debug('Server started at', server.url)

  // Launch browser
  browser = await chromium.launch()
})

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

describe('@vrowser/rolldown browser tests', () => {
  test('rolldown bundles code in the browser', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()

    if (E2E_DEBUG) {
      page.on('console', msg => debug('[CONSOLE]', msg.type(), msg.text()))
      page.on('pageerror', err => debug('[PAGE_ERROR]', err.message))
    }

    await page.goto(server.url)

    // Wait for bundling to complete (up to 30s for WASM init + bundling)
    await page.waitForFunction(
      () => {
        const status = document.getElementById('status')?.textContent
        return status === 'success' || status?.startsWith('error')
      },
      undefined,
      { timeout: 30000 }
    )

    const testState = await page.evaluate(() => (window as any).testState)

    expect(testState.status).toBe('success')
    expect(testState.error).toBeNull()
    expect(testState.result).not.toBeNull()
    expect(testState.result.code).toContain('add')
    expect(testState.result.code).toContain('console.log')

    await context.close()
  })
})
