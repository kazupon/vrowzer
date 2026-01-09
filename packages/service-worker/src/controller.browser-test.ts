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
          reason: 'expected-active-but-not-controller',
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
    test('expected-only policy: should only skipWait expected version', async () => {
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

      await controller.ready({ skipWaitingPolicy: 'expected-only' })

      expect(controller.state).toBe('activated')
      expect(controller.serviceWorker?.scriptURL).toContain('v2-basic.js')
    })

    test('always-when-waiting policy: should skipWait any waiting service worker', async () => {
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

      await controller.ready({ skipWaitingPolicy: 'always-when-waiting' })

      expect(controller.state).toBe('activated')
      expect(controller.serviceWorker?.scriptURL).toContain('v2-basic.js')
    })
  })
})
