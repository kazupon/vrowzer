/**
 * @vrowser/unplugin-service-worker Bun E2E Tests
 *
 * Tests Bun bundler's ability to correctly bundle Service Workers
 * using the unplugin-service-worker plugin.
 *
 * Run with: bun test e2e/bun.e2e_test.ts
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdir, rm, mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test'
import { buildWithBun } from './bundlers/bun.ts'
import { createStaticServer } from './utils/server.ts'
import {
  cleanupServiceWorkers,
  waitForStatus,
  getControllerState,
  getRecordedStates,
  getRecordedEvents,
  callControllerMethod,
  getSwScriptUrl
} from './utils/helpers.ts'

import type { Browser, BrowserContext } from '@playwright/test'
import type { StaticServer } from './utils/server.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLAYGROUND_DIR = join(__dirname, 'playground')
const OUTPUT_DIR = join(__dirname, '.output', 'bun')

let browser: Browser
let server: StaticServer
let context: BrowserContext

// Start browser and build once for all tests
beforeAll(async () => {
  // Prepare output directory
  await rm(OUTPUT_DIR, { recursive: true, force: true })
  await mkdir(OUTPUT_DIR, { recursive: true })

  // Build with Bun
  console.log('[E2E] Building with bun...')
  const result = await buildWithBun(PLAYGROUND_DIR, OUTPUT_DIR)
  if (!result.success) {
    throw result.error ?? new Error('Build failed for bun')
  }
  console.log('[E2E] Build complete for bun')

  // Start static server
  server = await createStaticServer(OUTPUT_DIR)
  console.log(`[E2E] Server started at ${server.url}`)

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
  // =========================================================================
  // Service Worker Registration Tests
  // =========================================================================

  test('Service Worker registers and activates correctly', async () => {
    const page = await context.newPage()
    await page.goto(server.url)

    // Wait for activation
    await waitForStatus(page, 'activated')

    // Verify state
    const state = await getControllerState(page)
    expect(state).toBe('activated')

    // Check that states were recorded
    const states = await getRecordedStates(page)
    expect(states.length).toBeGreaterThan(0)
    expect(states).toContain('activated')

    await page.close()
  })

  test('Service Worker is bundled as separate file with hash', async () => {
    // Check that SW file exists in output with hash
    const assets = await readdir(OUTPUT_DIR, { recursive: true })
    const swFiles = assets.filter(
      f => typeof f === 'string' && f.includes('sw') && f.endsWith('.js')
    )

    // Should have at least one sw file (bundled separately)
    expect(swFiles.length).toBeGreaterThan(0)

    // The SW file should have a hash in its name (e.g., sw-abc123.js)
    const hasHashedSw = swFiles.some(f => /sw.*-[\da-zA-Z_]+\.js$/.test(String(f)))
    expect(hasHashedSw).toBe(true)
  })

  test('main.js references bundled Service Worker correctly', async () => {
    const page = await context.newPage()
    await page.goto(server.url)

    await waitForStatus(page, 'activated')

    // Get the SW script URL from the controller or from the active registration
    let swUrl = await getSwScriptUrl(page)

    // Fallback: get URL from active registration
    if (!swUrl) {
      swUrl = await page.evaluate(async () => {
        const registrations = await navigator.serviceWorker.getRegistrations()
        const active = registrations.find(r => r.active)
        return active?.active?.scriptURL ?? null
      })
    }

    expect(swUrl).not.toBeNull()

    // The URL should contain a hashed filename
    expect(swUrl).toMatch(/sw.*-[\da-zA-Z_]+\.js/)

    await page.close()
  })

  // =========================================================================
  // Service Worker State Tests
  // =========================================================================

  test('Service Worker registration is active after ready', async () => {
    const page = await context.newPage()
    await page.goto(server.url)

    await waitForStatus(page, 'activated')

    // Check that the Service Worker registration is active
    const hasActiveRegistration = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      return registrations.some(r => r.active !== null)
    })

    expect(hasActiveRegistration).toBe(true)

    await page.close()
  })

  // =========================================================================
  // Circuit Breaker Tests (suspend/resume)
  // =========================================================================

  test('controller.suspend() changes state to suspended', async () => {
    const page = await context.newPage()
    await page.goto(server.url)

    await waitForStatus(page, 'activated')

    // Suspend
    await callControllerMethod(page, 'suspend')

    // Verify state
    const state = await getControllerState(page)
    expect(state).toBe('suspended')

    // Verify suspended event was fired
    const events = await getRecordedEvents(page)
    expect(events.some(e => e.type === 'suspended')).toBe(true)

    await page.close()
  })

  test('controller.resume() restores from suspended state', async () => {
    const page = await context.newPage()
    await page.goto(server.url)

    await waitForStatus(page, 'activated')

    // Suspend
    await callControllerMethod(page, 'suspend')
    expect(await getControllerState(page)).toBe('suspended')

    // Resume
    await callControllerMethod(page, 'resume')

    // Verify state
    const state = await getControllerState(page)
    expect(state).toBe('activated')

    // Verify resumed event was fired
    const events = await getRecordedEvents(page)
    expect(events.some(e => e.type === 'resumed')).toBe(true)

    await page.close()
  })

  // =========================================================================
  // State Transition Tests
  // =========================================================================

  test('controller transitions through lifecycle states correctly', async () => {
    const page = await context.newPage()
    await page.goto(server.url)

    await waitForStatus(page, 'activated')

    const states = await getRecordedStates(page)

    // Should have gone through installing -> activating -> activated
    expect(states.length).toBeGreaterThan(0)
    expect(states[states.length - 1]).toBe('activated')

    await page.close()
  })
})
