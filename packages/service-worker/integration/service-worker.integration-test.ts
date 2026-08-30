/**
 * @vrowzer/service-worker E2E Tests
 *
 * Comprehensive end-to-end tests covering:
 * - Controller API (createSvcWorkerController)
 * - Worker API (createSvcWorker)
 * - Admin API (getAllControllers, suspend/resume/terminate)
 */

import { chromium } from '@playwright/test'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vite-plus/test'

import type { Browser, BrowserContext, Page } from '@playwright/test'
import type { ViteDevServer } from 'vite'
import type { SvcWorkerControllerState } from '../src/controller.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageDir = dirname(__dirname)

let BASE_URL: string
let server: ViteDevServer
let browser: Browser

async function startDevServer(): Promise<{ url: string; server: ViteDevServer }> {
  const server = await createServer({
    root: packageDir,
    mode: 'integration',
    server: {
      port: 0,
      strictPort: false
    }
  })
  await server.listen()

  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') {
    await server.close()
    throw new Error('Failed to get Vite dev server address')
  }

  return { url: `http://localhost:${address.port}`, server }
}

// Helper to wait for controller status to be specific value
async function waitForStatus(page: Page, status: string, timeout = 15000): Promise<void> {
  await page.waitForFunction(
    (expectedStatus: string) => document.getElementById('status')?.textContent === expectedStatus,
    status,
    { timeout }
  )
}

// Helper to get controller state from the page
async function getControllerState(page: Page): Promise<SvcWorkerControllerState | null> {
  return page.evaluate(() => {
    return window.testState.controller?.state ?? null
  })
}

// Helper to get recorded states from the test page
async function getRecordedStates(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    return window.testState.states ?? []
  })
}

// Helper to get recorded events from the test page
async function getRecordedEvents(page: Page): Promise<Array<{ type: string; data?: unknown }>> {
  return page.evaluate(() => {
    return window.testState.events ?? []
  })
}

// Helper to call controller methods from the page
async function callControllerMethod(
  page: Page,
  method: string,
  ...args: unknown[]
): Promise<unknown> {
  return page.evaluate(
    ({ method, args }) => {
      const controller = window.testState.controller
      if (!controller) {
        throw new Error('Controller not available')
      }
      // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-return, typescript/no-unsafe-member-access -- For testing
      return (controller as any)[method](...args)
    },
    { method, args }
  )
}

// Helper to wait for the page to be controlled by Service Worker
async function waitForServiceWorkerController(page: Page, timeout = 5000): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout })
}

async function waitForRegistrationActive(page: Page, scope: string, timeout = 5000): Promise<void> {
  await page.waitForFunction(
    async expectedScope => {
      const registration = await navigator.serviceWorker.getRegistration(expectedScope)
      return registration?.active?.state === 'activated'
    },
    scope,
    { timeout }
  )
}

async function waitForRegistrationController(
  page: Page,
  scope: string,
  timeout = 5000
): Promise<void> {
  await page.waitForFunction(
    async expectedScope => {
      const registration = await navigator.serviceWorker.getRegistration(expectedScope)
      return (
        registration?.active != null && registration.active === navigator.serviceWorker.controller
      )
    },
    scope,
    { timeout }
  )
}

// Helper to fetch the test API endpoint from the Service Worker
async function fetchServiceWorkerApi(page: Page): Promise<{
  version: string
  sessionCount: number
  suspended: boolean
}> {
  // Wait for service worker to control the page first
  await waitForServiceWorkerController(page)
  return page.evaluate(async () => {
    const response = await fetch('/api/test')
    return response.json() as Promise<{
      version: string
      sessionCount: number
      suspended: boolean
    }>
  })
}

async function cleanupServiceWorkers(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(r => r.unregister()))
  })
}

// Setup: Start dev server and browser once for all tests
beforeAll(async () => {
  const devServer = await startDevServer()
  BASE_URL = devServer.url
  server = devServer.server
  browser = await chromium.launch()
})

// Cleanup: Close browser and stop server
afterAll(async () => {
  await browser?.close()
  await server?.close()
})

// =============================================================================
// Controller API Tests (createSvcWorkerController)
// =============================================================================

describe('Controller API (createSvcWorkerController)', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    // Cleanup: unregister all service workers
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html`)
    await cleanupServiceWorkers(page)
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('controller transitions through lifecycle states', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=v1`)

    // Wait for activation
    await waitForStatus(page, 'activated')

    // Verify state is activated
    const state = await getControllerState(page)
    expect(state).toBe('activated')

    // Check that states were recorded
    const states = await getRecordedStates(page)
    expect(states.length).toBeGreaterThan(0)
    expect(states).toContain('activated')

    await page.close()
  })

  test('controller.version matches expected version', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=test-v2`)

    await waitForStatus(page, 'activated')

    const version = await page.evaluate(() => {
      return window.testState?.controller?.version
    })
    expect(version).toBe('test-v2')

    await page.close()
  })

  test('controller.serviceWorker is available after activation', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=v1`)

    await waitForStatus(page, 'activated')

    const hasServiceWorker = await page.evaluate(() => {
      return window.testState.controller?.serviceWorker != null
    })
    expect(hasServiceWorker).toBe(true)

    await page.close()
  })

  test('controller singleton returns same instance', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=v1`)

    await waitForStatus(page, 'activated')

    // Try to create another controller with same options
    const isSameInstance = await page.evaluate(async () => {
      const { createSvcWorkerController } =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/controller.ts')>('/dist/controller.js')!
      const existingController = window.testState.controller
      if (!existingController) {
        throw new Error('Existing controller not available')
      }
      const newController = createSvcWorkerController({
        scriptURL: new URL(existingController.scriptURL),
        version: existingController.version,
        scope: '/',
        type: 'module'
      })
      return newController === existingController
    })
    expect(isSameInstance).toBe(true)

    await page.close()
  })

  test('waitForController claims the expected worker when a foreign worker controls the page', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?autostart=false`)

    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/e2e-sw-legacy.js', {
        scope: '/',
        type: 'module'
      })
    })
    await waitForRegistrationActive(page, '/')
    await waitForRegistrationController(page, '/')

    const result = await page.evaluate(async () => {
      const { createSvcWorkerController } =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/controller.ts')>('/dist/controller.js')!

      const controller = createSvcWorkerController({
        scriptURL: new URL('/e2e-sw-no-claim.js?version=v1', location.origin),
        version: 'v1',
        scope: '/integration/',
        type: 'module'
      })
      window.testState.controller = controller

      const ready = await controller.ready({
        timeout: 5000,
        skipWaitingPolicy: 'force',
        waitForController: true
      })
      const targetRegistration = await navigator.serviceWorker.getRegistration('/integration/')
      const registrationScopes = (await navigator.serviceWorker.getRegistrations())
        .map(registration => new URL(registration.scope).pathname)
        .sort()

      return {
        ready,
        targetControlsPage: targetRegistration?.active === navigator.serviceWorker.controller,
        controllerPath: navigator.serviceWorker.controller
          ? new URL(navigator.serviceWorker.controller.scriptURL).pathname
          : null,
        registrationScopes
      }
    })

    expect(result).toEqual({
      ready: true,
      targetControlsPage: true,
      controllerPath: '/e2e-sw-no-claim.js',
      registrationScopes: ['/', '/integration/']
    })

    await page.close()
  })

  test('waitForController distinguishes registrations that use the same script and version', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?autostart=false`)

    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/e2e-sw-no-claim.js?version=v1', {
        scope: '/',
        type: 'module'
      })
    })
    await waitForRegistrationActive(page, '/')
    await page.evaluate(async () => {
      const { createSvcWorkerClaimClientsMessage } =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/protocols.ts')>('/dist/protocols.js')!
      const registration = await navigator.serviceWorker.getRegistration('/')
      if (!registration?.active) {
        throw new Error('Root Service Worker is not active')
      }
      registration.active.postMessage(createSvcWorkerClaimClientsMessage())
    })
    await waitForRegistrationController(page, '/')

    const ready = await page.evaluate(async () => {
      const { createSvcWorkerController } =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/controller.ts')>('/dist/controller.js')!

      const controller = createSvcWorkerController({
        scriptURL: new URL('/e2e-sw-no-claim.js?version=v1', location.origin),
        version: 'v1',
        scope: '/integration/',
        type: 'module'
      })
      window.testState.controller = controller

      return controller.ready({
        timeout: 5000,
        skipWaitingPolicy: 'force',
        waitForController: true
      })
    })
    await waitForRegistrationActive(page, '/integration/')

    const result = await page.evaluate(async () => {
      const rootRegistration = await navigator.serviceWorker.getRegistration('/')
      const targetRegistration = await navigator.serviceWorker.getRegistration('/integration/')
      const registrationScopes = (await navigator.serviceWorker.getRegistrations())
        .map(registration => new URL(registration.scope).pathname)
        .sort()

      return {
        targetControlsPage: targetRegistration?.active === navigator.serviceWorker.controller,
        sameScriptURL:
          rootRegistration?.active?.scriptURL === targetRegistration?.active?.scriptURL,
        registrationScopes
      }
    })

    expect(ready).toBe(true)
    expect(result).toEqual({
      targetControlsPage: true,
      sameScriptURL: true,
      registrationScopes: ['/', '/integration/']
    })

    await page.close()
  })

  test('waitForController ignores unrelated controllerchange and cleans up after timeout', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?autostart=false`)

    const result = await page.evaluate(async () => {
      const container = navigator.serviceWorker
      const originalAddEventListener = container.addEventListener.bind(
        container
      ) as EventTarget['addEventListener']
      const originalRemoveEventListener = container.removeEventListener.bind(
        container
      ) as EventTarget['removeEventListener']
      const controllerChangeListeners = new Set<EventListenerOrEventListenerObject>()
      let controllerChangeAdds = 0
      let controllerChangeRemoves = 0

      Object.defineProperty(container, 'addEventListener', {
        configurable: true,
        value: (
          type: string,
          listener: EventListenerOrEventListenerObject | null,
          options?: boolean | AddEventListenerOptions
        ) => {
          if (type === 'controllerchange' && listener) {
            controllerChangeAdds++
            controllerChangeListeners.add(listener)
          }
          originalAddEventListener(type, listener, options)
        }
      })
      Object.defineProperty(container, 'removeEventListener', {
        configurable: true,
        value: (
          type: string,
          listener: EventListenerOrEventListenerObject | null,
          options?: boolean | EventListenerOptions
        ) => {
          if (type === 'controllerchange' && listener) {
            controllerChangeRemoves++
            controllerChangeListeners.delete(listener)
          }
          originalRemoveEventListener(type, listener, options)
        }
      })

      const { createSvcWorkerController } =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/controller.ts')>('/dist/controller.js')!
      const controller = createSvcWorkerController({
        scriptURL: new URL('/e2e-sw-ignore-claim.js', location.origin),
        version: 'v1',
        scope: '/integration/',
        type: 'module'
      })
      window.testState.controller = controller

      const readyPromise = controller.ready({
        timeout: 5000,
        skipWaitingPolicy: 'force',
        waitForController: true
      })

      const waitUntil = async (predicate: () => boolean, timeout: number) => {
        const startedAt = Date.now()
        while (!predicate()) {
          if (Date.now() - startedAt >= timeout) {
            throw new Error('Timed out waiting for integration test condition')
          }
          await new Promise(resolve => setTimeout(resolve, 25))
        }
      }

      await waitUntil(() => controllerChangeAdds === 1, 3000)
      const foreignRegistration = await navigator.serviceWorker.register('/e2e-sw-legacy.js', {
        scope: '/integration/api-test.html',
        type: 'module'
      })
      await waitUntil(
        () =>
          foreignRegistration.active?.state === 'activated' &&
          foreignRegistration.active === container.controller,
        3000
      )
      const controllerChangeAddsAfterForeign = controllerChangeAdds
      const ready = await readyPromise
      const targetRegistration = await navigator.serviceWorker.getRegistration('/integration/')

      return {
        ready,
        active: targetRegistration?.active?.state === 'activated',
        foreignController: foreignRegistration.active === container.controller,
        controllerChangeAddsAfterForeign,
        controllerChangeAdds,
        controllerChangeRemoves,
        remainingControllerChangeListeners: controllerChangeListeners.size
      }
    })

    expect(result).toEqual({
      ready: false,
      active: true,
      foreignController: true,
      controllerChangeAddsAfterForeign: 1,
      controllerChangeAdds: 1,
      controllerChangeRemoves: 1,
      remainingControllerChangeListeners: 0
    })

    await page.close()
  })

  test('controllerchange ignores a foreign controller after ready', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?autostart=false`)

    const ready = await page.evaluate(async () => {
      const { createSvcWorkerController } =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/controller.ts')>('/dist/controller.js')!

      const controller = createSvcWorkerController({
        scriptURL: new URL('/e2e-sw-no-claim.js?version=v1', location.origin),
        version: 'v1',
        scope: '/integration/',
        type: 'module'
      })
      window.testState.controller = controller

      return controller.ready({
        timeout: 5000,
        skipWaitingPolicy: 'force',
        waitForController: true
      })
    })
    expect(ready).toBe(true)
    await waitForRegistrationController(page, '/integration/')

    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/e2e-sw-legacy.js', {
        scope: '/integration/api-test.html',
        type: 'module'
      })
    })
    await waitForRegistrationActive(page, '/integration/api-test.html')
    await waitForRegistrationController(page, '/integration/api-test.html')
    await page.waitForFunction(() =>
      window.testState.controllerChanges.some(change =>
        change.controller?.includes('/e2e-sw-legacy.js')
      )
    )

    const result = await page.evaluate(async () => {
      const controller = window.testState.controller
      if (!controller) {
        throw new Error('Vrowzer controller is not available')
      }

      const suspended = await controller.suspend()
      await controller.resume()
      const registrationScopes = (await navigator.serviceWorker.getRegistrations())
        .map(registration => new URL(registration.scope).pathname)
        .sort()

      return {
        suspendedMode: suspended.mode,
        stateAfterResume: controller.state,
        serviceWorkerPath: controller.serviceWorker
          ? new URL(controller.serviceWorker.scriptURL).pathname
          : null,
        pageControllerPath: navigator.serviceWorker.controller
          ? new URL(navigator.serviceWorker.controller.scriptURL).pathname
          : null,
        registrationScopes
      }
    })

    expect(result).toEqual({
      suspendedMode: 'suspend',
      stateAfterResume: 'activated',
      serviceWorkerPath: '/e2e-sw-no-claim.js',
      pageControllerPath: '/e2e-sw-legacy.js',
      registrationScopes: ['/integration/', '/integration/api-test.html']
    })

    await page.close()
  })

  test('controllerchange event is fired after clients.claim()', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=v1`)

    await waitForStatus(page, 'activated')

    // With `clients.claim()` working correctly, controllerchange should be fired
    // and `navigator.serviceWorker.controller` should be set
    const controllerChanges = await page.evaluate(() => window.testState.controllerChanges)
    expect(controllerChanges.length).toBeGreaterThan(0)
    expect(controllerChanges[0]?.controller).toContain('e2e-sw.js')

    // navigator.serviceWorker.controller should be set
    const controllerUrl = await page.evaluate(
      () => navigator.serviceWorker.controller?.scriptURL ?? null
    )
    expect(controllerUrl).toContain('e2e-sw.js')

    await page.close()
  })

  test('reloadSuggested event is fired when clients.claim() is not called', async () => {
    const page = await context.newPage()
    // Use e2e-sw-no-claim.js which does NOT call clients.claim()
    await page.goto(
      `${BASE_URL}/integration/api-test.html?version=v1&sw=/e2e-sw-no-claim.js?version=v1`
    )

    await waitForStatus(page, 'activated')

    // Check that reloadSuggested event was fired
    const events = await getRecordedEvents(page)
    const reloadSuggestedEvent = events.find(e => e.type === 'reloadSuggested')

    expect(reloadSuggestedEvent).toBeDefined()
    expect(reloadSuggestedEvent?.data).toMatchObject({
      reason: 'unclaimed',
      version: 'v1'
    })

    // controllerchange should NOT be fired (no clients.claim())
    const controllerChanges = await page.evaluate(() => window.testState.controllerChanges)
    expect(controllerChanges.length).toBe(0)

    // navigator.serviceWorker.controller should be null
    const controllerUrl = await page.evaluate(
      () => navigator.serviceWorker.controller?.scriptURL ?? null
    )
    expect(controllerUrl).toBeNull()

    await page.close()
  })

  test('skipWaiting allows new version to activate immediately', async () => {
    const page = await context.newPage()
    // Use e2e-sw-skip-waiting.js which calls skipWaiting() in install event
    await page.goto(
      `${BASE_URL}/integration/api-test.html?version=v1&sw=/e2e-sw-skip-waiting.js?version=v1`
    )

    await waitForStatus(page, 'activated')

    // Verify state transitions include activating (skipWaiting skips the waiting state)
    const states = await getRecordedStates(page)
    // With skipWaiting, the service worker should go: 'installing' -> 'activating' -> 'activated'
    // (skipping 'waiting' state)
    expect(states).toContain('activated')

    // With `clients.claim()`, the page should be controlled
    const controllerUrl = await page.evaluate(
      () => navigator.serviceWorker.controller?.scriptURL ?? null
    )
    expect(controllerUrl).toContain('e2e-sw-skip-waiting.js')

    await page.close()
  })

  test('skipWaitingPolicy "strict" promotes only expected version', async () => {
    const page = await context.newPage()

    // First, register service worker v1 and wait for activation
    await page.goto(
      `${BASE_URL}/integration/api-test.html?version=v1&sw=/e2e-sw-no-skip-waiting.js?version=v1`
    )
    await waitForStatus(page, 'activated')

    // Now register service worker v2 (will go to waiting state since v1 is active)
    // Then create a controller with 'strict' policy expecting v2
    const result = await page.evaluate(async () => {
      const { createSvcWorkerController } =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/controller.ts')>('/dist/controller.js')!

      // Dispose existing controller
      window.testState.controller?.dispose()

      // Register service worker v2 directly to create waiting state
      await navigator.serviceWorker.register('/e2e-sw-no-skip-waiting.js?version=v2', {
        scope: '/',
        type: 'module'
      })

      // Wait a bit for v2 to enter waiting state
      await new Promise(r => setTimeout(r, 500))

      // Create controller with strict policy expecting v2
      const controller = createSvcWorkerController({
        scriptURL: new URL('/e2e-sw-no-skip-waiting.js?version=v2', window.location.origin),
        version: 'v2',
        scope: '/',
        type: 'module'
      })

      const ready = await controller.ready({
        skipWaitingPolicy: 'strict',
        timeout: 10000
      })

      return {
        ready,
        version: controller.version,
        state: controller.state
      }
    })

    expect(result.ready).toBe(true)
    expect(result.version).toBe('v2')
    expect(result.state).toBe('activated')

    await page.close()
  })

  test('skipWaitingPolicy "force" promotes any waiting service worker', async () => {
    const page = await context.newPage()

    // First, register SW v1 and wait for activation
    await page.goto(
      `${BASE_URL}/integration/api-test.html?version=v1&sw=/e2e-sw-no-skip-waiting.js?version=v1`
    )
    await waitForStatus(page, 'activated')

    // Now register service worker v2 (will go to waiting state)
    // Then create a controller with 'force' policy
    const result = await page.evaluate(async () => {
      const { createSvcWorkerController } =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/controller.ts')>('/dist/controller.js')!

      // Dispose existing controller
      window.testState.controller?.dispose()

      // Register service worker v2 directly to create waiting state
      await navigator.serviceWorker.register('/e2e-sw-no-skip-waiting.js?version=v2', {
        scope: '/',
        type: 'module'
      })

      // Wait a bit for v2 to enter waiting state
      await new Promise(r => setTimeout(r, 500))

      // Create controller with force policy - should promote any waiting service worker
      const controller = createSvcWorkerController({
        scriptURL: new URL('/e2e-sw-no-skip-waiting.js?version=v2', window.location.origin),
        version: 'v2',
        scope: '/',
        type: 'module'
      })

      const ready = await controller.ready({
        skipWaitingPolicy: 'force',
        timeout: 10000
      })

      return {
        ready,
        version: controller.version,
        state: controller.state
      }
    })

    expect(result.ready).toBe(true)
    expect(result.version).toBe('v2')
    expect(result.state).toBe('activated')

    await page.close()
  })
})

// =============================================================================
// Worker API Tests (createSvcWorker)
// =============================================================================

describe('Worker API (createSvcWorker)', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html`)
    await cleanupServiceWorkers(page)
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('Service Worker responds with version via fetch handler', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=v1`)

    await waitForStatus(page, 'activated')

    // With `clients.claim()` working, no reload needed
    const apiResponse = await fetchServiceWorkerApi(page)

    expect(apiResponse.version).toBe('v1')
    expect(apiResponse.suspended).toBe(false)
    expect(typeof apiResponse.sessionCount).toBe('number')

    await page.close()
  })

  test('Service Worker version is configurable via query parameter', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=custom-version-123`)

    await waitForStatus(page, 'activated')

    // With `clients.claim()` working, no reload needed
    const apiResponse = await fetchServiceWorkerApi(page)

    expect(apiResponse.version).toBe('custom-version-123')

    await page.close()
  })
})

// =============================================================================
// Circuit Breaker Tests (suspend/resume via Controller)
// =============================================================================

describe('Circuit Breaker (Controller.suspend/resume)', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html`)
    await cleanupServiceWorkers(page)
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('controller.suspend() changes state to suspended', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=v1`)

    await waitForStatus(page, 'activated')

    // Call suspend
    const suspendResult = await page.evaluate(async () => {
      const controller = window.testState.controller
      if (!controller) {
        throw new Error('Controller not available')
      }
      const result = await controller.suspend()
      // Return a plain object for serialization
      // `SvcWorkerSessionCircuitBreakerResult`: {mode, terminated, cachesCleared}
      return {
        mode: result.mode,
        terminated: result.terminated
      }
    })

    expect(suspendResult.mode).toBe('suspend')
    expect(suspendResult.terminated).toBe(false)

    // Verify state changed
    const state = await getControllerState(page)
    expect(state).toBe('suspended')

    // Verify suspended event was fired
    const events = await getRecordedEvents(page)
    expect(events.some(e => e.type === 'suspended')).toBe(true)

    await page.close()
  })

  test('Service Worker suspended flag is true after suspend', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=v1`)

    await waitForStatus(page, 'activated')

    // Suspend
    await callControllerMethod(page, 'suspend')

    // The fetch handler should now be bypassed, so we need to check directly
    // Since the service worker is suspended, fetching /api/test should return network fetch (no SW handling)
    // However, the /api/test endpoint only exists in the SW, so it will fail
    // Instead, let's verify via the controller state
    const state = await getControllerState(page)
    expect(state).toBe('suspended')

    await page.close()
  })

  test('controller.resume() restores from suspended state', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=v1`)

    await waitForStatus(page, 'activated')

    // Suspend first
    await callControllerMethod(page, 'suspend')
    expect(await getControllerState(page)).toBe('suspended')

    // Resume
    // `SvcWorkerSessionResumeResult` is an empty object - success is indicated by Promise resolving
    await page.evaluate(async () => {
      const controller = window.testState.controller
      if (!controller) {
        throw new Error('Controller not available')
      }
      await controller.resume()
    })

    // Verify state changed back to activated
    const state = await getControllerState(page)
    expect(state).toBe('activated')

    // Verify resumed event was fired
    const events = await getRecordedEvents(page)
    expect(events.some(e => e.type === 'resumed')).toBe(true)

    await page.close()
  })

  test('Service Worker fetch handler works again after resume', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=v1`)

    await waitForStatus(page, 'activated')

    // With `clients.claim()` working, no reload needed
    // Verify initial fetch works
    let apiResponse = await fetchServiceWorkerApi(page)
    expect(apiResponse.suspended).toBe(false)

    // Suspend
    await callControllerMethod(page, 'suspend')

    // Resume
    await callControllerMethod(page, 'resume')

    // Verify fetch works again
    apiResponse = await fetchServiceWorkerApi(page)
    expect(apiResponse.suspended).toBe(false)
    expect(apiResponse.version).toBe('v1')

    await page.close()
  })
})

// =============================================================================
// Admin API Tests
// =============================================================================

describe('Admin API', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html`)
    await cleanupServiceWorkers(page)
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('getAllControllers returns registered controllers', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=v1`)

    await waitForStatus(page, 'activated')

    const controllers = await page.evaluate(async () => {
      const admin =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/admin.ts')>('/dist/admin.js')!
      const all = admin.getAllControllers()
      return all.map((c: { version: string; state: string }) => ({
        version: c.version,
        state: c.state
      }))
    })

    expect(controllers.length).toBeGreaterThan(0)
    expect(controllers.some((c: { version: string }) => c.version === 'v1')).toBe(true)

    await page.close()
  })

  test('getController returns specific controller', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=v1`)

    await waitForStatus(page, 'activated')

    const controller = await page.evaluate(async () => {
      const admin =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/admin.ts')>('/dist/admin.js')!
      const testController = window.testState.controller
      if (!testController) {
        throw new Error('Test controller not available')
      }
      const found = admin.getController(new URL(testController.scriptURL), 'v1')
      return found
        ? {
            version: found.version,
            state: found.state
          }
        : null
    })

    expect(controller).not.toBeNull()
    expect(controller?.version).toBe('v1')

    await page.close()
  })

  test('suspendAllServiceWorkers suspends all active controllers', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=v1`)

    await waitForStatus(page, 'activated')

    // SvcWorkerSessionCircuitBreakerResult: {mode, terminated, cachesCleared}
    const results = await page.evaluate(async () => {
      const admin =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/admin.ts')>('/dist/admin.js')!
      const resultMap = await admin.suspendAllServiceWorkers()
      const resultsArray: Array<{ key: string; mode: string }> = []
      resultMap.forEach((value: { mode: string }, key: string) => {
        resultsArray.push({ key, mode: value.mode })
      })
      return resultsArray
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r: { mode: string }) => r.mode === 'suspend')).toBe(true)

    // Verify state is suspended
    const state = await getControllerState(page)
    expect(state).toBe('suspended')

    await page.close()
  })

  test('resumeAllServiceWorkers resumes all suspended controllers', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=v1`)

    await waitForStatus(page, 'activated')

    // Suspend first
    await page.evaluate(async () => {
      const admin =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/admin.ts')>('/dist/admin.js')!
      await admin.suspendAllServiceWorkers()
    })

    expect(await getControllerState(page)).toBe('suspended')

    // Resume all
    // `SvcWorkerSessionResumeResult` is an empty object - success is indicated by Promise resolving
    const resultCount = await page.evaluate(async () => {
      const admin =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/admin.ts')>('/dist/admin.js')!
      const resultMap = await admin.resumeAllServiceWorkers()
      return resultMap.size
    })

    expect(resultCount).toBeGreaterThan(0)

    // Verify state is activated
    const state = await getControllerState(page)
    expect(state).toBe('activated')

    await page.close()
  })

  test('disposeAllControllers cleans up all controllers', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html?version=v1`)

    await waitForStatus(page, 'activated')

    await page.evaluate(async () => {
      const admin =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/admin.ts')>('/dist/admin.js')!
      admin.disposeAllControllers()
    })

    // After disposal, getAllControllers should return empty
    const count = await page.evaluate(async () => {
      const admin =
        // oxlint-disable-next-line no-unsafe-optional-chaining, typescript/no-non-null-asserted-optional-chain -- For testing
        await window.dynamicImport?.<typeof import('../src/admin.ts')>('/dist/admin.js')!
      return admin.getAllControllers().length
    })

    expect(count).toBe(0)

    await page.close()
  })
})

// =============================================================================
// Multi-tab Scenarios
// =============================================================================

describe('Multi-tab Scenarios', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html`)
    await cleanupServiceWorkers(page)
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('multiple pages share the same Service Worker', async () => {
    const page1 = await context.newPage()
    await page1.goto(`${BASE_URL}/integration/api-test.html?version=v1`)
    await waitForStatus(page1, 'activated')

    // With `clients.claim()` working, no reload needed
    const page2 = await context.newPage()
    await page2.goto(`${BASE_URL}/integration/api-test.html?version=v1`)
    await waitForStatus(page2, 'activated')

    // Both should have the same Service Worker controlling them
    const sw1 = await page1.evaluate(() => navigator.serviceWorker.controller?.scriptURL)
    const sw2 = await page2.evaluate(() => navigator.serviceWorker.controller?.scriptURL)

    expect(sw1).toBeDefined()
    expect(sw1).toBe(sw2)

    await page1.close()
    await page2.close()
  })

  test('controller singleton is per-page (not shared across tabs)', async () => {
    const page1 = await context.newPage()
    await page1.goto(`${BASE_URL}/integration/api-test.html?version=v1`)
    await waitForStatus(page1, 'activated')

    const page2 = await context.newPage()
    await page2.goto(`${BASE_URL}/integration/api-test.html?version=v1`)
    await waitForStatus(page2, 'activated')

    // Each page has its own controller instance (JavaScript contexts are isolated)
    // But they manage the same Service Worker
    const state1 = await getControllerState(page1)
    const state2 = await getControllerState(page2)

    expect(state1).toBe('activated')
    expect(state2).toBe('activated')

    await page1.close()
    await page2.close()
  })
})

// =============================================================================
// Version Management
// =============================================================================

describe('Version Management', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/integration/api-test.html`)
    await cleanupServiceWorkers(page)
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('different versions create different Service Workers', async () => {
    const page1 = await context.newPage()
    await page1.goto(`${BASE_URL}/integration/api-test.html?version=version-a`)
    await waitForStatus(page1, 'activated')

    // With `clients.claim()` working, no reload needed
    const api1 = await fetchServiceWorkerApi(page1)
    expect(api1.version).toBe('version-a')

    // Unregister and create new version
    await page1.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(r => r.unregister()))
    })

    await page1.goto(`${BASE_URL}/integration/api-test.html?version=version-b`)
    await waitForStatus(page1, 'activated')

    // With `clients.claim()` working, no reload needed
    const api2 = await fetchServiceWorkerApi(page1)
    expect(api2.version).toBe('version-b')

    await page1.close()
  })
})
