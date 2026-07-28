import { beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import type { ReloadSuggestInfo, StateChangeInfo } from './controller.ts'
import { createSvcWorkerController } from './controller.ts'

// Helper to clean up all service worker registrations
async function cleanupServiceWorkers(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map(r => r.unregister()))
}

describe('createSvcWorkerController', () => {
  beforeEach(async () => {
    await cleanupServiceWorkers()
  })

  describe('basic functionality', () => {
    test('should register and activate a new service worker', async () => {
      const stateChanges: StateChangeInfo[] = []

      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-basic.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      controller.on('changeState', info => {
        stateChanges.push(info)
      })

      const result = await controller.ready()

      expect(result).toBe(true)
      expect(controller.state).toBe('activated')
      expect(controller.serviceWorker).toBeDefined()
      expect(controller.serviceWorker?.state).toBe('activated')
    })

    test('should return immediately if expected service worker is already controller', async () => {
      // First, register and activate the service worker
      const firstController = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-basic.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })
      await firstController.ready()

      // Second call should return immediately
      const progressPhases: string[] = []
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-basic.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      controller.on('progress', phase => {
        progressPhases.push(phase)
      })

      const result = await controller.ready()

      expect(result).toBe(true)
      expect(controller.state).toBe('activated')
    })

    test('should handle service worker with skipWaiting called during install', async () => {
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-skip-waiting.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      const result = await controller.ready()

      expect(result).toBe(true)
      expect(controller.state).toBe('activated')
      expect(controller.serviceWorker).toBeDefined()
    })
  })

  describe('`clients.claim` behavior', () => {
    test('should activate service worker with `clients.claim()`', async () => {
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-with-claim.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      const result = await controller.ready()

      expect(result).toBe(true)
      expect(controller.state).toBe('activated')
      expect(controller.serviceWorker?.state).toBe('activated')
    })

    test('should emit reloadSuggested for service worker without `clients.claim()`', async () => {
      // For service workers without `clients.claim()`, the controller will still activate
      // but reloadSuggested event may be emitted
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-no-claim.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      using reloadSuggestedMock = vi.fn<(info: ReloadSuggestInfo) => void>()
      controller.on('reloadSuggested', reloadSuggestedMock)

      const result = await controller.ready()

      // The controller should still reach 'activated' state
      expect(result).toBe(true)
      expect(controller.state).toBe('activated')
      expect(reloadSuggestedMock).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'unclaimed',
          version: 'v1'
        })
      )
    })
  })

  describe('timeout handling', () => {
    test('should return false when timeout is reached during slow install', async () => {
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-slow-install.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      // Use a very short timeout to trigger timeout
      const result = await controller.ready({ timeout: 100 })

      expect(result).toBe(false)
      expect(controller.serviceWorker).toBeNull()
    })
  })

  describe('state change events', () => {
    test('should emit changeState events during service worker lifecycle', async () => {
      const stateChanges: StateChangeInfo[] = []

      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-basic.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      controller.on('changeState', info => {
        stateChanges.push(info)
      })

      await controller.ready()

      // The state should be 'activated' after ready resolves
      expect(controller.state).toBe('activated')
      // At least one state change should have occurred
      expect(stateChanges.length).toBeGreaterThan(0)
      // The last state change should be 'activated'
      expect(stateChanges[stateChanges.length - 1]!.state).toBe('activated')
    })
  })

  describe('progress events', () => {
    test('should emit progress events', async () => {
      const progressPhases: string[] = []

      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-basic.js', location.origin),
        version: 'v1',
        scope: '/controller/',
        debug: (...args: unknown[]) => progressPhases.push(String(args[1] || args[0]))
      })

      controller.on('progress', phase => {
        progressPhases.push(phase)
      })

      await controller.ready()

      // Progress should include 'registering' and 'registered' at minimum
      expect(progressPhases.some(p => p.includes('registering') || p.includes('progress'))).toBe(
        true
      )
    })
  })

  describe('skipWaitingPolicy', () => {
    test('`strict` policy: should only skipWait expected version', async () => {
      // First register v1
      const firstController = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-basic.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })
      await firstController.ready()

      // Now register v2 with expected-only policy
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v2-basic.js', location.origin),
        version: 'v2',
        scope: '/controller/'
      })

      await controller.ready({ skipWaitingPolicy: 'strict' })

      expect(controller.state).toBe('activated')
      expect(controller.serviceWorker?.scriptURL).toContain('v2-basic.js')
    })

    test('`force` policy: should skipWait any waiting service worker', async () => {
      // First register v1
      const firstController = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-basic.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })
      await firstController.ready()

      // Now register v2 with always-when-waiting policy
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v2-basic.js', location.origin),
        version: 'v2',
        scope: '/controller/'
      })

      await controller.ready({ skipWaitingPolicy: 'force' })

      expect(controller.state).toBe('activated')
      expect(controller.serviceWorker?.scriptURL).toContain('v2-basic.js')
    })
  })

  describe('singleton', () => {
    test('should return the same instance for same scriptURL and version', () => {
      const controller1 = createSvcWorkerController({
        scriptURL: new URL('/controller/singleton-test.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      const controller2 = createSvcWorkerController({
        scriptURL: new URL('/controller/singleton-test.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      expect(controller1).toBe(controller2)

      controller1.dispose()
    })

    test('should return different instances for different versions', () => {
      const controller1 = createSvcWorkerController({
        scriptURL: new URL('/controller/singleton-test.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      const controller2 = createSvcWorkerController({
        scriptURL: new URL('/controller/singleton-test.js', location.origin),
        version: 'v2',
        scope: '/controller/'
      })

      expect(controller1).not.toBe(controller2)

      controller1.dispose()
      controller2.dispose()
    })

    test('should return different instances for different scriptURLs', () => {
      const controller1 = createSvcWorkerController({
        scriptURL: new URL('/controller/singleton-a.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      const controller2 = createSvcWorkerController({
        scriptURL: new URL('/controller/singleton-b.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      expect(controller1).not.toBe(controller2)

      controller1.dispose()
      controller2.dispose()
    })

    test('should throw error when called with different options for same key', () => {
      const url = new URL('/controller/singleton-test.js', location.origin)
      const controller1 = createSvcWorkerController({
        scriptURL: url,
        version: 'v1',
        scope: '/controller/'
      })

      expect(() => {
        createSvcWorkerController({
          scriptURL: new URL('/controller/singleton-test.js', location.origin),
          version: 'v1',
          scope: '/different-scope/'
        })
      }).toThrow(
        `already exists with different options: scriptURL=${url.href}, version=v1, scope=/controller/`
      )

      controller1.dispose()
    })

    test('should create new instance after dispose', () => {
      const controller1 = createSvcWorkerController({
        scriptURL: new URL('/controller/singleton-test.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      controller1.dispose()

      const controller2 = createSvcWorkerController({
        scriptURL: new URL('/controller/singleton-test.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      expect(controller1).not.toBe(controller2)

      controller2.dispose()
    })

    test('should support `using` syntax', () => {
      // `using` testing
      {
        using controller = createSvcWorkerController({
          scriptURL: new URL('/controller/singleton-test.js', location.origin),
          version: 'v1',
          scope: '/controller/'
        })

        expect(controller[Symbol.dispose]).toBeDefined()
        expect(typeof controller[Symbol.dispose]).toBe('function')
      }
    })

    test('should allow same options after dispose', () => {
      const controller1 = createSvcWorkerController({
        scriptURL: new URL('/controller/singleton-test.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      controller1.dispose()

      // Should not throw - same options are allowed after dispose
      const controller2 = createSvcWorkerController({
        scriptURL: new URL('/controller/singleton-test.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      expect(controller2).toBeDefined()

      controller2.dispose()
    })

    test('should work multiple dispose calls gracefully', () => {
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/singleton-test.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      controller.dispose()
      // Second dispose should be no-op and not throw
      controller.dispose()
    })
  })

  describe('properties', () => {
    test('should expose scriptURL property as URL href', () => {
      const url = new URL('/controller/props-test.js', location.origin)
      const controller = createSvcWorkerController({
        scriptURL: url,
        version: 'v1',
        scope: '/controller/'
      })

      expect(controller.scriptURL).toBe(url.href)
    })

    test('should expose scriptURL as string when URL object is provided', () => {
      const url = new URL('/controller/props-test-url.js', location.origin)
      const controller = createSvcWorkerController({
        scriptURL: url,
        version: 'v1',
        scope: '/controller/'
      })

      expect(controller.scriptURL).toBe(url.href)
    })

    test('should expose version property', () => {
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/props-test.js', location.origin),
        version: 'v2.0.0',
        scope: '/controller/'
      })

      expect(controller.version).toBe('v2.0.0')
    })
  })

  describe('suspend and resume', () => {
    test('suspend should throw error if session not established', async () => {
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/suspend-test.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      // Don't call ready() - session is not established
      await expect(controller.suspend()).rejects.toThrow(
        'Session not established. Call ready() first.'
      )
    })

    test('resume should throw error if session not established', async () => {
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/resume-test.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      // Don't call ready() - session is not established
      await expect(controller.resume()).rejects.toThrow(
        'Session not established. Call ready() first.'
      )
    })

    test('suspend should throw error if not in activated state', async () => {
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/suspend-state-test.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      // State is 'installing' initially
      expect(controller.state).toBe('installing')

      await expect(controller.suspend()).rejects.toThrow(
        'Session not established. Call ready() first.'
      )
    })
  })

  describe('circuit breaker with protocol-enabled service worker', () => {
    test('should suspend service worker successfully', async () => {
      const suspendedEvents: void[] = []
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-circuit-breaker.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      controller.on('suspended', () => {
        suspendedEvents.push(undefined)
      })

      await controller.ready()
      expect(controller.state).toBe('activated')

      const result = await controller.suspend()

      expect(result.mode).toBe('suspend')
      expect(result.terminated).toBe(false)
      expect(controller.state).toBe('suspended')
      expect(suspendedEvents).toHaveLength(1)
    })

    test('should resume service worker after suspend', async () => {
      const resumedEvents: void[] = []
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-circuit-breaker.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      controller.on('resumed', () => {
        resumedEvents.push(undefined)
      })

      await controller.ready()

      await controller.suspend()
      expect(controller.state).toBe('suspended')

      const result = await controller.resume()

      expect(result).toBeDefined()
      expect(controller.state).toBe('activated')
      expect(resumedEvents).toHaveLength(1)
    })

    test('should throw error when resuming non-suspended service worker', async () => {
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-circuit-breaker.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      await controller.ready()
      expect(controller.state).toBe('activated')

      await expect(controller.resume()).rejects.toThrow('Cannot resume in state: activated')
    })

    test('should allow suspend with clearCaches option', async () => {
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-circuit-breaker.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      await controller.ready()

      const result = await controller.suspend({ clearCaches: true })

      expect(result.mode).toBe('suspend')
      expect(result.cachesCleared).toBeDefined()
      expect(Array.isArray(result.cachesCleared)).toBe(true)
      expect(controller.state).toBe('suspended')
    })

    test('should transition through correct states: activated -> suspended -> activated', async () => {
      const stateChanges: string[] = []
      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-circuit-breaker.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      controller.on('suspended', () => {
        stateChanges.push('suspended')
      })
      controller.on('resumed', () => {
        stateChanges.push('resumed')
      })

      await controller.ready()
      expect(controller.state).toBe('activated')

      await controller.suspend()
      expect(controller.state).toBe('suspended')

      await controller.resume()
      expect(controller.state).toBe('activated')

      expect(stateChanges).toEqual(['suspended', 'resumed'])
    })

    test('should recognize suspended state after page reload simulation', async () => {
      // Step 1: Create controller and activate service worker
      const controller1 = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-circuit-breaker.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      const result1 = await controller1.ready()
      expect(result1).toBe(true)
      expect(controller1.state).toBe('activated')

      // Step 2: Suspend the service worker
      await controller1.suspend()
      expect(controller1.state).toBe('suspended')

      // Step 3: Simulate page reload by disposing controller (but NOT unregistering SW)
      // This mimics what happens when a page is reloaded - the controller instance is lost
      // but the service worker remains registered and in suspended state
      controller1.dispose()

      // Step 4: Create a new controller (simulating what happens after page reload)
      const controller2 = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-circuit-breaker.js', location.origin),
        version: 'v1',
        scope: '/controller/'
      })

      // Step 5: Call ready() on the new controller
      const result2 = await controller2.ready()
      expect(result2).toBe(true)

      // Bug: The controller state should be 'suspended' because the service worker
      // is still in suspended mode, but it incorrectly reports 'activated'
      expect(controller2.state).toBe('suspended')
    })
  })

  describe('waitForController option', () => {
    // NOTE: Full integration test of waitForController: true is in
    // play-dev-server's Playwright tests. Browser tests run on a page
    // at '/' while SW scope is '/controller/', so clients.claim()
    // cannot control the test page, making waitForController: true
    // impossible to test here.

    test('ready() without waitForController emits reloadSuggested for SW that does not call clients.claim()', async () => {
      const reloadSuggested = vi.fn()

      const controller = createSvcWorkerController({
        scriptURL: new URL('/controller/v1-claim-on-message.js', location.href),
        version: 'v1',
        scope: '/controller/'
      })

      controller.on('reloadSuggested', reloadSuggested)

      const result = await controller.ready({
        timeout: 10000,
        skipWaitingPolicy: 'force'
        // waitForController defaults to false
      })

      expect(result).toBe(true)
      expect(controller.state).toBe('activated')
      expect(reloadSuggested).toHaveBeenCalled()

      controller.dispose()
    })
  })
})
