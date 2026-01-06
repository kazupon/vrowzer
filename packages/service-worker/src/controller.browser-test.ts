import { vi, describe, test, expect, beforeEach } from 'vitest'
import { createSvcWorkerController, SvcWorkerControllerError } from './controller.ts'

// Helper to clean up all service worker registrations
async function cleanupServiceWorkers(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map(r => r.unregister()))
}

describe('SvcWorkerController#ready', () => {
  beforeEach(async () => {
    await cleanupServiceWorkers()
  })

  describe('success', () => {
    test('basic: should wait for service worker to be activated', async () => {
      const controller = createSvcWorkerController({
        scriptURL: '/controller/basic.js',
        type: 'module',
        scope: '/controller/'
      })

      await expect(controller.ready()).resolves.toBeUndefined()
      const registration = await navigator.serviceWorker.getRegistration('/controller/')
      expect(registration?.active?.state).toBe('activated')
    })

    test('with claim: should wait for service worker to call `clients.claim()`', async () => {
      // Use root scope so the test page can be claimed by the service worker
      const controller = createSvcWorkerController({
        scriptURL: '/claim-test.js',
        type: 'module',
        scope: '/'
      })

      await expect(controller.ready({ claim: true })).resolves.toBeUndefined()
      const registration = await navigator.serviceWorker.getRegistration('/')
      expect(registration?.active?.state).toBe('activated')
    })

    test('take a little time at installation: should wait for service worker to be activated', async () => {
      const controller = createSvcWorkerController({
        scriptURL: '/controller/little-time-install.js',
        type: 'module',
        scope: '/controller/'
      })

      await expect(controller.ready()).resolves.toBeUndefined()
      const registration = await navigator.serviceWorker.getRegistration('/controller/')
      expect(registration?.active?.state).toBe('activated')
    })
  })

  describe('failure', () => {
    test('should throw `SvcWorkerControllerError` when service worker will not be activated', async () => {
      const controller = createSvcWorkerController({
        scriptURL: '/controller/reject-install.js',
        type: 'module',
        scope: '/controller/'
      })

      await expect(controller.ready()).rejects.toThrow(SvcWorkerControllerError)
      const registration = await navigator.serviceWorker.getRegistration('/controller/')
      expect(registration?.active).toBeUndefined()
    })

    test('should throw `DOMException` when service worker operation is aborted', async () => {
      const controller = createSvcWorkerController({
        scriptURL: '/controller/long-time-install.js',
        type: 'module',
        scope: '/controller/'
      })
      const abortController = new AbortController()

      const promise = controller.ready({ signal: abortController.signal })
      abortController.abort()
      await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    })
  })

  describe('edge cases', () => {
    test('ready called twice: should resolve immediately on second call', async () => {
      const controller = createSvcWorkerController({
        scriptURL: '/controller/basic.js',
        type: 'module',
        scope: '/controller/'
      })

      await expect(controller.ready()).resolves.toBeUndefined()
      await expect(controller.ready()).resolves.toBeUndefined()
      const registration = await navigator.serviceWorker.getRegistration('/controller/')
      expect(registration?.active?.state).toBe('activated')
    })
  })
})

describe('SvcWorkerController#shutdown', () => {
  beforeEach(async () => {
    await cleanupServiceWorkers()
  })

  describe('success', () => {
    test('basic: should wait for service worker to be achieved to unregister', async () => {
      const controller = createSvcWorkerController({
        scriptURL: '/controller/basic.js',
        type: 'module',
        scope: '/controller/'
      })
      await controller.ready()

      await expect(controller.shutdown()).resolves.toBeUndefined()
      // Note: After unregister, the controller may still exist but registration is gone
      const registration = await navigator.serviceWorker.getRegistration('/controller/')
      expect(registration).toBeUndefined()
    })
  })

  describe('failure', () => {
    function sleep(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }

    test('should throw `SvcWorkerControllerError` when service worker will not be activated to unregister', async () => {
      const controller = createSvcWorkerController({
        scriptURL: '/controller/basic.js',
        type: 'module',
        scope: '/controller/'
      })
      await controller.ready()

      // mock unregister to fail
      using _mock = vi
        .spyOn(navigator.serviceWorker, 'getRegistration')
        .mockImplementation(async () => {
          return Promise.resolve({
            unregister: () => Promise.resolve(false)
          } as unknown as ServiceWorkerRegistration)
        })

      await expect(controller.shutdown()).rejects.toThrow(SvcWorkerControllerError)
    })

    test('should throw `DOMException` when service worker operation is aborted', async () => {
      const controller = createSvcWorkerController({
        scriptURL: '/controller/basic.js',
        type: 'module',
        scope: '/controller/'
      })
      await controller.ready()

      // mock unregister to take a long time
      using _mock = vi
        .spyOn(navigator.serviceWorker, 'getRegistration')
        .mockImplementation(async () => {
          await sleep(100)
          return undefined
        })

      const abortController = new AbortController()
      const promise = controller.shutdown(abortController.signal)
      abortController.abort()
      await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    })
  })

  describe('edge cases', () => {
    test('no ready: should do nothing when shutdown is called before ready', async () => {
      const controller = createSvcWorkerController({
        scriptURL: '/controller/basic.js',
        type: 'module',
        scope: '/controller/'
      })

      await expect(controller.shutdown()).resolves.toBeUndefined()
      const registration = await navigator.serviceWorker.getRegistration('/controller/')
      expect(registration).toBeUndefined()
    })

    test('double shutdown: should do nothing on second call', async () => {
      const controller = createSvcWorkerController({
        scriptURL: '/controller/basic.js',
        type: 'module',
        scope: '/controller/'
      })
      await controller.ready()

      await expect(controller.shutdown()).resolves.toBeUndefined()
      await expect(controller.shutdown()).resolves.toBeUndefined()
      const registration = await navigator.serviceWorker.getRegistration('/controller/')
      expect(registration).toBeUndefined()
    })
  })
})
