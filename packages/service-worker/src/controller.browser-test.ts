import { beforeEach, describe, expect, test, vi } from 'vitest'
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
        scriptURL: '/controller/v1-basic.js',
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
        scriptURL: '/controller/v1-basic.js',
        version: 'v1',
        scope: '/controller/'
      })
      await firstController.ready()

      // Second call should return immediately
      const progressPhases: string[] = []
      const controller = createSvcWorkerController({
        scriptURL: '/controller/v1-basic.js',
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
        scriptURL: '/controller/v1-skip-waiting.js',
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
        scriptURL: '/controller/v1-with-claim.js',
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
        scriptURL: '/controller/v1-no-claim.js',
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
        scriptURL: '/controller/v1-slow-install.js',
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
        scriptURL: '/controller/v1-basic.js',
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
        scriptURL: '/controller/v1-basic.js',
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
        scriptURL: '/controller/v1-basic.js',
        version: 'v1',
        scope: '/controller/'
      })
      await firstController.ready()

      // Now register v2 with expected-only policy
      const controller = createSvcWorkerController({
        scriptURL: '/controller/v2-basic.js',
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
        scriptURL: '/controller/v1-basic.js',
        version: 'v1',
        scope: '/controller/'
      })
      await firstController.ready()

      // Now register v2 with always-when-waiting policy
      const controller = createSvcWorkerController({
        scriptURL: '/controller/v2-basic.js',
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
        scriptURL: '/controller/singleton-test.js',
        version: 'v1',
        scope: '/controller/'
      })

      const controller2 = createSvcWorkerController({
        scriptURL: '/controller/singleton-test.js',
        version: 'v1',
        scope: '/controller/'
      })

      expect(controller1).toBe(controller2)

      controller1.dispose()
    })

    test('should return different instances for different versions', () => {
      const controller1 = createSvcWorkerController({
        scriptURL: '/controller/singleton-test.js',
        version: 'v1',
        scope: '/controller/'
      })

      const controller2 = createSvcWorkerController({
        scriptURL: '/controller/singleton-test.js',
        version: 'v2',
        scope: '/controller/'
      })

      expect(controller1).not.toBe(controller2)

      controller1.dispose()
      controller2.dispose()
    })

    test('should return different instances for different scriptURLs', () => {
      const controller1 = createSvcWorkerController({
        scriptURL: '/controller/singleton-a.js',
        version: 'v1',
        scope: '/controller/'
      })

      const controller2 = createSvcWorkerController({
        scriptURL: '/controller/singleton-b.js',
        version: 'v1',
        scope: '/controller/'
      })

      expect(controller1).not.toBe(controller2)

      controller1.dispose()
      controller2.dispose()
    })

    test('should throw error when called with different options for same key', () => {
      const controller1 = createSvcWorkerController({
        scriptURL: '/controller/singleton-test.js',
        version: 'v1',
        scope: '/controller/'
      })

      expect(() => {
        createSvcWorkerController({
          scriptURL: '/controller/singleton-test.js',
          version: 'v1',
          scope: '/different-scope/'
        })
      }).toThrow(
        'already exists with different options: scriptURL=/controller/singleton-test.js, version=v1, scope=/controller/'
      )

      controller1.dispose()
    })

    test('should create new instance after dispose', () => {
      const controller1 = createSvcWorkerController({
        scriptURL: '/controller/singleton-test.js',
        version: 'v1',
        scope: '/controller/'
      })

      controller1.dispose()

      const controller2 = createSvcWorkerController({
        scriptURL: '/controller/singleton-test.js',
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
          scriptURL: '/controller/singleton-test.js',
          version: 'v1',
          scope: '/controller/'
        })

        expect(controller[Symbol.dispose]).toBeDefined()
        expect(typeof controller[Symbol.dispose]).toBe('function')
      }
    })

    test('should allow same options after dispose', () => {
      const controller1 = createSvcWorkerController({
        scriptURL: '/controller/singleton-test.js',
        version: 'v1',
        scope: '/controller/'
      })

      controller1.dispose()

      // Should not throw - same options are allowed after dispose
      const controller2 = createSvcWorkerController({
        scriptURL: '/controller/singleton-test.js',
        version: 'v1',
        scope: '/controller/'
      })

      expect(controller2).toBeDefined()

      controller2.dispose()
    })

    test('should work multiple dispose calls gracefully', () => {
      const controller = createSvcWorkerController({
        scriptURL: '/controller/singleton-test.js',
        version: 'v1',
        scope: '/controller/'
      })

      controller.dispose()
      // Second dispose should be no-op and not throw
      controller.dispose()
    })
  })

  describe('properties', () => {
    test('should expose scriptURL property', () => {
      const controller = createSvcWorkerController({
        scriptURL: '/controller/props-test.js',
        version: 'v1',
        scope: '/controller/'
      })

      expect(controller.scriptURL).toBe('/controller/props-test.js')
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
        scriptURL: '/controller/props-test.js',
        version: 'v2.0.0',
        scope: '/controller/'
      })

      expect(controller.version).toBe('v2.0.0')
    })
  })

  describe('suspend and resume', () => {
    test('suspend should throw error if session not established', async () => {
      const controller = createSvcWorkerController({
        scriptURL: '/controller/suspend-test.js',
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
        scriptURL: '/controller/resume-test.js',
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
        scriptURL: '/controller/suspend-state-test.js',
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
        scriptURL: '/controller/v1-circuit-breaker.js',
        version: 'v1',
        scope: '/controller/'
      })

      controller.on('suspended', () => {
        suspendedEvents.push(undefined)
      })

      await controller.ready()
      expect(controller.state).toBe('activated')
      expect(controller.session).not.toBeNull()

      const result = await controller.suspend()

      expect(result.mode).toBe('suspend')
      expect(result.terminated).toBe(false)
      expect(controller.state).toBe('suspended')
      expect(suspendedEvents).toHaveLength(1)
    })

    test('should resume service worker after suspend', async () => {
      const resumedEvents: void[] = []
      const controller = createSvcWorkerController({
        scriptURL: '/controller/v1-circuit-breaker.js',
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
        scriptURL: '/controller/v1-circuit-breaker.js',
        version: 'v1',
        scope: '/controller/'
      })

      await controller.ready()
      expect(controller.state).toBe('activated')

      await expect(controller.resume()).rejects.toThrow('Cannot resume in state: activated')
    })

    test('should allow suspend with clearCaches option', async () => {
      const controller = createSvcWorkerController({
        scriptURL: '/controller/v1-circuit-breaker.js',
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
        scriptURL: '/controller/v1-circuit-breaker.js',
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
  })
})
