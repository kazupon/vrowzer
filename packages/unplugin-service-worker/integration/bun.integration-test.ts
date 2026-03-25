/**
 * @vrowzer/unplugin-service-worker Bun E2E Tests
 *
 * Tests Bun bundler's ability to correctly bundle Service Workers
 * using the unplugin-service-worker plugin.
 *
 * Run with: bun test integration/bun.integration-test.ts
 *
 * Environment variables:
 * - E2E_DEBUG: Enable debug logging (e.g., "1" or "true")
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rm, mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test'
import { buildWithBun } from './bundlers/bun.ts'
import { testCases } from './cases.ts'
import { createStaticServer } from './utils/server.ts'
import { cleanupServiceWorkers } from './utils/helpers.ts'

import type { Browser, BrowserContext } from '@playwright/test'
import type { StaticServer } from './utils/server.ts'
import type { Expect } from './cases.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLAYGROUND_DIR = join(__dirname, 'playground')
const OUTPUT_DIR = join(__dirname, '.output', 'bun')

// Debug logging (enabled via E2E_DEBUG env var)
const E2E_DEBUG = process.env.E2E_DEBUG === '1' || process.env.E2E_DEBUG === 'true'
const debug = (...args: unknown[]) => E2E_DEBUG && console.log('[E2E]', ...args)

let browser: Browser
let server: StaticServer
let context: BrowserContext

// Start browser and build once for all tests
beforeAll(async () => {
  // Prepare output directory
  await rm(OUTPUT_DIR, { recursive: true, force: true })
  await mkdir(OUTPUT_DIR, { recursive: true })

  // Build with Bun
  debug('Building with bun...')
  const result = await buildWithBun(PLAYGROUND_DIR, OUTPUT_DIR)
  if (!result.success) {
    throw result.error ?? new Error('Build failed for bun')
  }
  debug('Build complete for bun')

  // Start static server
  server = await createStaticServer(OUTPUT_DIR)
  debug(`Server started at ${server.url}`)

  // Launch browser
  browser = await chromium.launch()
})

// Close browser and server after all tests
afterAll(async () => {
  await browser?.close()
  await server?.close()
})

// Create fresh browser context for each test
beforeEach(async () => {
  context = await browser.newContext()
  // Clean up service workers before each test
  const page = await context.newPage()
  await page.goto(server.url)
  await cleanupServiceWorkers(page)
  await page.close()
})

// Close context after each test
afterEach(async () => {
  await context?.close()
})

describe('bun bundler', () => {
  // Register all shared test cases
  for (const testCase of testCases) {
    const testFn = testCase.skip ? test.skip : test
    testFn(testCase.name, async () => {
      await testCase.fn(
        {
          getPage: async () => {
            const page = await context.newPage()
            await page.goto(server.url)
            return page
          },
          outputDir: OUTPUT_DIR
        },
        expect as unknown as Expect
      )
    })
  }
})
