/**
 * @vrowzer/rolldown E2E Tests
 *
 * Verifies that the pre-bundled rolldown works in a browser environment.
 * Builds a test playground with Vite, serves it with a static server
 * (with COOP/COEP headers for SharedArrayBuffer), then uses Playwright
 * to verify rolldown can bundle code in the browser.
 */

import { chromium } from '@playwright/test'
import { copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, test } from 'vite-plus/test'
import { createStaticServer } from './utils/server.ts'

import type { Browser } from '@playwright/test'
import type { StaticServer } from './utils/server.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLAYGROUND_DIR = join(__dirname, 'playground')
const PLAYGROUND_SHARED_DIR = join(__dirname, 'playground-shared')
const PLAYGROUND_UTILS_DIR = join(__dirname, 'playground-utils')
const OUTPUT_DIR = join(__dirname, '.output')
const OUTPUT_SHARED_DIR = join(__dirname, '.output-shared')
const OUTPUT_UTILS_DIR = join(__dirname, '.output-utils')

const E2E_DEBUG = process.env.E2E_DEBUG === '1' || process.env.E2E_DEBUG === 'true'
const debug = (...args: unknown[]) => E2E_DEBUG && console.log('[E2E]', ...args)

let browser: Browser
let server: StaticServer

async function buildPlayground(playgroundDir: string, outputDir: string) {
  await build({
    root: playgroundDir,
    base: '/',
    logLevel: 'warn',
    build: {
      outDir: outputDir,
      emptyOutDir: true,
      sourcemap: false,
      minify: false,
      rollupOptions: {
        input: join(playgroundDir, 'index.html')
      }
    }
  })
}

function copyDistFiles(outputDir: string) {
  const distDir = join(__dirname, '..', 'dist')
  copyFileSync(join(distDir, 'worker.js'), join(outputDir, 'worker.js'))
  copyFileSync(
    join(distDir, 'rolldown-binding.wasm32-wasi.wasm'),
    join(outputDir, 'rolldown-binding.wasm32-wasi.wasm')
  )
}

beforeAll(async () => {
  // Build standalone playground
  debug('Building standalone playground...')
  await buildPlayground(PLAYGROUND_DIR, OUTPUT_DIR)
  copyDistFiles(OUTPUT_DIR)

  // Build shared playground
  debug('Building shared playground...')
  await buildPlayground(PLAYGROUND_SHARED_DIR, OUTPUT_SHARED_DIR)
  copyDistFiles(OUTPUT_SHARED_DIR)

  // Build utils playground
  debug('Building utils playground...')
  await buildPlayground(PLAYGROUND_UTILS_DIR, OUTPUT_UTILS_DIR)
  copyDistFiles(OUTPUT_UTILS_DIR)
  debug('Build complete')

  // Launch browser
  browser = await chromium.launch()
})

afterAll(async () => {
  await browser?.close()
})

async function waitForTestState(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () => {
      const status = document.getElementById('status')?.textContent
      return status === 'success' || status?.startsWith('error')
    },
    undefined,
    { timeout: 30000 }
  )
  return page.evaluate(() => (window as any).testState)
}

describe('standalone build (./browser)', () => {
  let server: StaticServer

  beforeAll(async () => {
    server = await createStaticServer(OUTPUT_DIR)
    debug('Standalone server at', server.url)
  })

  afterAll(async () => {
    await server?.close()
  })

  test('rolldown bundles code in the browser', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()

    if (E2E_DEBUG) {
      page.on('console', msg => debug('[CONSOLE]', msg.type(), msg.text()))
      page.on('pageerror', err => debug('[PAGE_ERROR]', err.message))
    }

    await page.goto(server.url)
    const testState = await waitForTestState(page)

    expect(testState.status).toBe('success')
    expect(testState.error).toBeNull()
    expect(testState.result).not.toBeNull()
    expect(testState.result.code).toContain('add')
    expect(testState.result.code).toContain('console.log')
    expect(testState.result.version).toBe('1.2.0')

    await context.close()
  })
})

describe('shared build (./) — memfs instance sharing with @vrowzer/fs', () => {
  let server: StaticServer

  beforeAll(async () => {
    server = await createStaticServer(OUTPUT_SHARED_DIR)
    debug('Shared server at', server.url)
  })

  afterAll(async () => {
    await server?.close()
  })

  test('rolldown memfs and @vrowzer/fs share the same Volume instance', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()

    if (E2E_DEBUG) {
      page.on('console', msg => debug('[CONSOLE]', msg.type(), msg.text()))
      page.on('pageerror', err => debug('[PAGE_ERROR]', err.message))
    }

    await page.goto(server.url)
    const testState = await waitForTestState(page)

    expect(testState.status).toBe('success')
    expect(testState.error).toBeNull()
    expect(testState.result).not.toBeNull()

    // Verify memfs instances are shared
    expect(testState.result.sharedRead).toBe(true)

    // Verify rolldown can bundle files written via @vrowzer/fs, including
    // source larger than the default 10KB fs-proxy payload.
    expect(testState.result.bundleCode).toContain('add')
    expect(testState.result.bundleCode).toContain('console.log')
    expect(testState.result.largeSourceBundled).toBe(true)

    // Verify Rolldown resolves path aliases using the closest tsconfig.json.
    expect(testState.result.closestTsconfigResolved).toBe(true)
    expect(testState.result.parentTsconfigIgnored).toBe(true)

    await context.close()
  })
})

describe('utils build (./utils) — transformSync, parseSync, minifySync in browser', () => {
  let server: StaticServer

  beforeAll(async () => {
    server = await createStaticServer(OUTPUT_UTILS_DIR)
    debug('Utils server at', server.url)
  })

  afterAll(async () => {
    await server?.close()
  })

  test('transformSync strips TypeScript types and replaces defines', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()

    if (E2E_DEBUG) {
      page.on('console', msg => debug('[CONSOLE]', msg.type(), msg.text()))
      page.on('pageerror', err => debug('[PAGE_ERROR]', err.message))
    }

    await page.goto(server.url)
    const testState = await waitForTestState(page)

    expect(testState.status).toBe('success')
    expect(testState.error).toBeNull()
    expect(testState.result).not.toBeNull()

    // TypeScript types should be stripped
    expect(testState.result.tsHasTypes).toBe(true)
    expect(testState.result.tsOutputNoTypes).toBe(true)
    expect(testState.result.tsOutput).toContain('greeting')
    expect(testState.result.tsOutput).toContain('add')

    // Define replacement should work
    expect(testState.result.defineReplaced).toBe(true)

    // parseSync should produce a valid AST
    expect(testState.result.parseHasProgram).toBe(true)
    expect(testState.result.parseBodyLength).toBeGreaterThan(0)
    expect(testState.result.parseNoErrors).toBe(true)

    // minifySync should produce shorter output without comments
    expect(testState.result.minifyRemovesComments).toBe(true)
    expect(testState.result.minifyShorter).toBe(true)
    expect(testState.result.minifyOutput).toContain('console')

    await context.close()
  })
})
