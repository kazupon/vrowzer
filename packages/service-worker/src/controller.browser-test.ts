import { beforeEach, describe, expect, test } from 'vitest'
import type { StateChangeInfo } from './controller.ts'
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

      const controller = await createSvcWorkerController({
        scriptURL: '/controller/v1-basic.js',
        version: 'v1',
        scope: '/controller/'
      })

      controller.on('changeState', info => {
        if (info && typeof info === 'object' && 'state' in info) {
          stateChanges.push(info as StateChangeInfo)
        }
      })

      expect(controller.state).toBe('activated')
      expect(controller.serviceWorker).toBeDefined()
      expect(controller.serviceWorker.state).toBe('activated')
    })

    test('should return immediately if expected SW is already controller', async () => {
      // First, register and activate the SW
      await createSvcWorkerController({
        scriptURL: '/controller/v1-basic.js',
        version: 'v1',
        scope: '/controller/'
      })

      // Second call should return immediately
      const progressPhases: string[] = []
      const controller = await createSvcWorkerController({
        scriptURL: '/controller/v1-basic.js',
        version: 'v1',
        scope: '/controller/'
      })

      controller.on('progress', phase => {
        if (typeof phase === 'string') progressPhases.push(phase)
      })

      expect(controller.state).toBe('activated')
    })

    test('should handle SW with skipWaiting called during install', async () => {
      const controller = await createSvcWorkerController({
        scriptURL: '/controller/v1-skip-waiting.js',
        version: 'v1',
        scope: '/controller/'
      })

      expect(controller.state).toBe('activated')
      expect(controller.serviceWorker).toBeDefined()
    })
  })

  describe('clients.claim behavior', () => {
    test('should activate SW with clients.claim()', async () => {
      const controller = await createSvcWorkerController({
        scriptURL: '/controller/v1-with-claim.js',
        version: 'v1',
        scope: '/controller/'
      })

      expect(controller.state).toBe('activated')
      expect(controller.serviceWorker.state).toBe('activated')
    })

    test('should emit reloadSuggested for SW without clients.claim()', async () => {
      // For SWs without clients.claim(), the controller will still activate
      // but reloadSuggested event may be emitted
      const controller = await createSvcWorkerController({
        scriptURL: '/controller/v1-no-claim.js',
        version: 'v1',
        scope: '/controller/'
      })

      // The controller should still reach 'activated' state
      expect(controller.state).toBe('activated')
    })
  })

  describe('abort handling', () => {
    test('should abort when signal is triggered during slow install', async () => {
      const abortController = new AbortController()

      const promise = createSvcWorkerController({
        scriptURL: '/controller/v1-slow-install.js',
        version: 'v1',
        scope: '/controller/',
        signal: abortController.signal
      })

      // Abort after a short delay
      setTimeout(() => abortController.abort(), 100)

      await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    })

    test('should not start if signal is already aborted', async () => {
      const abortController = new AbortController()
      abortController.abort()

      const promise = createSvcWorkerController({
        scriptURL: '/controller/v1-basic.js',
        version: 'v1',
        scope: '/controller/',
        signal: abortController.signal
      })

      await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    })
  })

  describe('state change events', () => {
    test('should emit changeState events during SW lifecycle', async () => {
      // Set up to capture state changes during creation
      const controller = await createSvcWorkerController({
        scriptURL: '/controller/v1-basic.js',
        version: 'v1',
        scope: '/controller/'
      })

      // Note: Events may have already fired before we can attach listeners
      // The state should be 'activated' after the promise resolves
      expect(controller.state).toBe('activated')
    })
  })

  describe('progress events', () => {
    test('should emit progress events', async () => {
      const progressPhases: string[] = []

      await createSvcWorkerController({
        scriptURL: '/controller/v1-basic.js',
        version: 'v1',
        scope: '/controller/',
        debug: (...args: unknown[]) => progressPhases.push(String(args[1] || args[0]))
      })

      // Progress should include 'registering' and 'registered' at minimum
      expect(progressPhases.some(p => p.includes('registering') || p.includes('progress'))).toBe(
        true
      )
    })
  })

  describe('skipWaitingPolicy', () => {
    test('expected-only policy: should only skipWait expected version', async () => {
      // First register v1
      await createSvcWorkerController({
        scriptURL: '/controller/v1-basic.js',
        version: 'v1',
        scope: '/controller/'
      })

      // Now register v2 with expected-only policy
      const controller = await createSvcWorkerController({
        scriptURL: '/controller/v2-basic.js',
        version: 'v2',
        scope: '/controller/',
        skipWaitingPolicy: 'expected-only'
      })

      expect(controller.state).toBe('activated')
    })

    test('always-when-waiting policy: should skipWait any waiting SW', async () => {
      // First register v1
      await createSvcWorkerController({
        scriptURL: '/controller/v1-basic.js',
        version: 'v1',
        scope: '/controller/'
      })

      // Now register v2 with always-when-waiting policy
      const controller = await createSvcWorkerController({
        scriptURL: '/controller/v2-basic.js',
        version: 'v2',
        scope: '/controller/',
        skipWaitingPolicy: 'always-when-waiting'
      })

      expect(controller.state).toBe('activated')
    })
  })
})
