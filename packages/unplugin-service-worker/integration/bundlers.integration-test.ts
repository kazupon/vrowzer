/**
 * @vrowzer/unplugin-service-worker E2E Tests
 *
 * Tests each bundler's ability to correctly bundle Service Workers
 * using the unplugin-service-worker plugin.
 *
 * Environment variables:
 * - BUNDLER: Comma-separated list of bundlers to test (e.g., "vite,rollup")
 *           If not set, all bundlers are tested.
 * - E2E_DEBUG: Enable debug logging (e.g., "1" or "true")
 */

import { spawn, spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { BUNDLERS } from './bundlers/index.ts'
import { testCases } from './cases.ts'
import { createStaticServer } from './utils/server.ts'
import { cleanupServiceWorkers, prepareOutputDir } from './utils/helpers.ts'

import type { Browser, BrowserContext } from '@playwright/test'
import type { StaticServer } from './utils/server.ts'
import type { Expect } from './cases.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLAYGROUND_DIR = join(__dirname, 'playground')

// Debug logging (enabled via E2E_DEBUG env var)
const E2E_DEBUG = process.env.E2E_DEBUG === '1' || process.env.E2E_DEBUG === 'true'
const debug = (...args: unknown[]) => E2E_DEBUG && console.log('[E2E]', ...args)

// Filter bundlers based on BUNDLER env var
const BUNDLER_FILTER = process.env.BUNDLER?.split(',').map(b => b.trim().toLowerCase())
const BUNDLERS_TO_TEST = BUNDLER_FILTER
  ? BUNDLERS.filter(b => BUNDLER_FILTER.includes(b.name.toLowerCase()))
  : BUNDLERS

let browser: Browser

// Start browser once for all tests
beforeAll(async () => {
  browser = await chromium.launch()
})

// Close browser after all tests
afterAll(async () => {
  await browser?.close()
})

// Run tests for each bundler
for (const bundler of BUNDLERS_TO_TEST) {
  describe(`${bundler.name} bundler`, () => {
    const outputDir = join(__dirname, '.output', bundler.name)
    let server: StaticServer
    let context: BrowserContext

    // Build and start server for this bundler
    beforeAll(async () => {
      // Prepare output directory
      await prepareOutputDir(outputDir)

      // Build with this bundler
      debug(`Building with ${bundler.name}...`)
      const result = await bundler.build(PLAYGROUND_DIR, outputDir)
      if (!result.success) {
        throw result.error ?? new Error(`Build failed for ${bundler.name}`)
      }
      debug(`Build complete for ${bundler.name}`)

      // Start static server
      server = await createStaticServer(outputDir)
      debug(`Server started at ${server.url}`)
    })

    // Stop server after tests
    afterAll(async () => {
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

    // Register all shared test cases
    for (const testCase of testCases) {
      const shouldSkip = testCase.skip || testCase.skipBundlers?.includes(bundler.name)
      const testFn = shouldSkip ? test.skip : test
      testFn(testCase.name, async () => {
        await testCase.fn(
          {
            getPage: async () => {
              const page = await context.newPage()
              if (E2E_DEBUG) {
                page.on('console', msg =>
                  debug(`[${bundler.name}][CONSOLE]`, msg.type(), msg.text())
                )
                page.on('pageerror', err => debug(`[${bundler.name}][PAGE_ERROR]`, err.message))
              }
              await page.goto(server.url)
              return page
            },
            outputDir
          },
          expect as unknown as Expect
        )
      })
    }
  })
}

// =============================================================================
// Bun Bundler Tests (spawned via bun test)
// =============================================================================

/**
 * Check if Bun is available in the environment
 */
function isBunAvailable(): boolean {
  try {
    const result = spawnSync('bun', ['--version'], { stdio: 'pipe' })
    return result.status === 0
  } catch {
    return false
  }
}

const TIMEOUT = 60000

/**
 * Runs bun test as a child process.
 * Actual tests are in bun.integration-test.ts (underscore, not matched by vitest).
 */
function runBunTest(): Promise<{ success: boolean; exitCode: number | null }> {
  return new Promise(resolve => {
    const bunProcess = spawn(
      'bun',
      ['test', './integration/bun.integration-test.ts', '--timeout', TIMEOUT.toString()],
      {
        cwd: join(__dirname, '..'),
        stdio: E2E_DEBUG ? 'inherit' : 'pipe',
        env: { ...process.env }
      }
    )

    bunProcess.on('close', code => {
      resolve({ success: code === 0, exitCode: code })
    })

    bunProcess.on('error', () => {
      resolve({ success: false, exitCode: null })
    })
  })
}

// Only run Bun tests if no BUNDLER filter is set, or if 'bun' is in the filter
const shouldRunBunTest = !BUNDLER_FILTER || BUNDLER_FILTER.includes('bun')

// Check if Bun is available
const bunAvailable = isBunAvailable()
if (shouldRunBunTest && !bunAvailable) {
  console.warn('[E2E] Warning: Bun is not installed. Skipping Bun bundler tests.')
}

describe.skipIf(!shouldRunBunTest || !bunAvailable)('bun bundler', () => {
  test('all Bun E2E tests pass', { timeout: TIMEOUT }, async () => {
    const result = await runBunTest()
    expect(result.success, `Bun tests failed with exit code ${result.exitCode}`).toBe(true)
  })
})
