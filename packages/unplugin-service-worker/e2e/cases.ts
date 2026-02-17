/**
 * Shared E2E Test Cases
 *
 * This module contains test case definitions that can be used by both
 * vitest (bundlers.e2e-test.ts) and bun:test (bun.e2e_test.ts).
 *
 * Each test case is a plain async function that takes a TestContext and Expect.
 */

import { readdir } from 'node:fs/promises'

import type { Page } from '@playwright/test'

import {
  waitForStatus,
  getControllerState,
  getRecordedStates,
  getRecordedEvents,
  callControllerMethod,
  getSwScriptUrl
} from './utils/helpers.ts'

/**
 * Context provided to each test case
 */
export interface TestContext {
  /** Get a new page with server URL loaded */
  getPage: () => Promise<Page>
  /** Output directory for the bundler */
  outputDir: string
}

/**
 * Expect-like assertion interface (compatible with vitest and bun:test)
 */
export interface Expect {
  (value: unknown): {
    toBe: (expected: unknown) => void
    toBeNull: () => void
    toBeGreaterThan: (expected: number) => void
    toContain: (expected: unknown) => void
    toMatch: (expected: RegExp) => void
    not: {
      toBeNull: () => void
    }
  }
}

/**
 * Test case definition
 */
export interface TestCase {
  name: string
  skip?: boolean
  fn: (ctx: TestContext, expect: Expect) => Promise<void>
}

// =============================================================================
// Service Worker Registration Tests
// =============================================================================

const registerAndActivate: TestCase = {
  name: 'Service Worker registers and activates correctly',
  fn: async (ctx, expect) => {
    const page = await ctx.getPage()

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
  }
}

const bundledWithHash: TestCase = {
  name: 'Service Worker is bundled as separate file with hash',
  fn: async (ctx, expect) => {
    // Check that SW file exists in output with hash
    const assets = await readdir(ctx.outputDir, { recursive: true })
    const swFiles = assets.filter(
      f => typeof f === 'string' && f.includes('sw') && f.endsWith('.js')
    )

    // Should have at least one sw file (bundled separately)
    expect(swFiles.length).toBeGreaterThan(0)

    // The SW file should have a hash in its name (e.g., sw-abc123.js, sw-AbC123.js, or sw-DY_EZcR_.js)
    // Note: Rollup uses Base64-like hashes that may contain underscores
    const hasHashedSw = swFiles.some(f => /sw.*-[\da-zA-Z_]+\.js$/.test(String(f)))
    expect(hasHashedSw).toBe(true)
  }
}

const referencesCorrectly: TestCase = {
  name: 'main.js references bundled Service Worker correctly',
  fn: async (ctx, expect) => {
    const page = await ctx.getPage()

    await waitForStatus(page, 'activated')

    // Get the SW script URL from the controller or from the active registration
    // Note: For Rollup/Rolldown, controller.scriptURL may be undefined due to
    // ROLLUP_FILE_URL resolving to a string instead of URL object
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
    // Note: Rollup uses Base64-like hashes that may contain underscores
    expect(swUrl).toMatch(/sw.*-[\da-zA-Z_]+\.js/)

    await page.close()
  }
}

const activeAfterReady: TestCase = {
  name: 'Service Worker registration is active after ready',
  fn: async (ctx, expect) => {
    const page = await ctx.getPage()

    await waitForStatus(page, 'activated')

    // Check that the Service Worker registration is active
    const hasActiveRegistration = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      return registrations.some(r => r.active !== null)
    })

    expect(hasActiveRegistration).toBe(true)

    await page.close()
  }
}

// =============================================================================
// Circuit Breaker Tests (suspend/resume)
// =============================================================================

const suspendChangesState: TestCase = {
  name: 'controller.suspend() changes state to suspended',
  fn: async (ctx, expect) => {
    const page = await ctx.getPage()

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
  }
}

const resumeRestoresState: TestCase = {
  name: 'controller.resume() restores from suspended state',
  fn: async (ctx, expect) => {
    const page = await ctx.getPage()

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
  }
}

// =============================================================================
// State Transition Tests
// =============================================================================

const lifecycleTransitions: TestCase = {
  name: 'controller transitions through lifecycle states correctly',
  fn: async (ctx, expect) => {
    const page = await ctx.getPage()

    await waitForStatus(page, 'activated')

    const states = await getRecordedStates(page)

    // Should have gone through installing -> activating -> activated
    // (The exact sequence depends on browser behavior)
    expect(states.length).toBeGreaterThan(0)
    expect(states[states.length - 1]).toBe('activated')

    await page.close()
  }
}

// =============================================================================
// WASM Inline Tests
// =============================================================================

const wasmInlineWorks: TestCase = {
  name: 'WASM is inlined as base64 data URL in SW bundle',
  fn: async (ctx, expect) => {
    // Verify the bundled SW contains inlined WASM as base64 data URL
    // instead of the original new URL("*.wasm", import.meta.url) pattern
    const assets = await readdir(ctx.outputDir, { recursive: true })
    const swFiles = assets.filter(
      f => typeof f === 'string' && f.includes('sw') && f.endsWith('.js')
    )
    expect(swFiles.length).toBeGreaterThan(0)

    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const swContent = await readFile(join(ctx.outputDir, String(swFiles[0])), 'utf-8')

    // Should contain base64-encoded WASM data URL
    expect(swContent).toContain('data:application/wasm;base64,')

    // Should NOT contain the original import.meta.url pattern or {}.url
    expect(swContent).not.toMatch(/new\s+URL\(["'][^"']*\.wasm["']/)
  }
}

// =============================================================================
// Assets Option Tests
// =============================================================================

const assetsEmitted: TestCase = {
  name: 'assets option emits additional files alongside SW bundle',
  fn: async (ctx, expect) => {
    const assets = await readdir(ctx.outputDir, { recursive: true })

    // add.wasm should be emitted alongside SW bundle
    const wasmFiles = assets.filter(f => typeof f === 'string' && f.endsWith('.wasm'))
    expect(wasmFiles.length).toBeGreaterThan(0)
  }
}

// =============================================================================
// Export all test cases
// =============================================================================

/**
 * All shared test cases for Service Worker E2E testing
 */
export const testCases: TestCase[] = [
  // Service Worker Registration Tests
  registerAndActivate,
  bundledWithHash,
  referencesCorrectly,
  activeAfterReady,

  // Circuit Breaker Tests
  suspendChangesState,
  resumeRestoresState,

  // State Transition Tests
  lifecycleTransitions,

  // WASM Inline Tests
  wasmInlineWorks,

  // Assets Option Tests
  assetsEmitted
]
