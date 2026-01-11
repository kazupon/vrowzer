import { vi, afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createSvcWorkerController } from './controller.ts'
import * as registry from './registry.ts'
import {
  disposeAllControllers,
  getAllControllers,
  getController,
  resumeAllServiceWorkers,
  resumeServiceWorker,
  suspendAllServiceWorkers,
  suspendServiceWorker,
  terminateServiceWorker
} from './admin.ts'

// Helper to clean up all service worker registrations
async function cleanupServiceWorkers(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map(r => r.unregister()))
}

beforeEach(async () => {
  // First dispose all controllers to clean up sessions
  for (const controller of registry.getAll()) {
    controller.dispose()
  }
  registry.clear()
  await cleanupServiceWorkers()
})

afterEach(() => {
  // Clean up after each test
  for (const controller of registry.getAll()) {
    controller.dispose()
  }
  registry.clear()
})

describe('getAllControllers', () => {
  test('should return empty array when no controllers are registered', () => {
    const controllers = getAllControllers()
    expect(controllers).toEqual([])
  })

  test('should return registered controller', async () => {
    using controller = createSvcWorkerController({
      scriptURL: '/controller/v1-circuit-breaker.js',
      version: 'v1',
      scope: '/controller/'
    })
    await controller.ready()

    const controllers = getAllControllers()
    expect(controllers).toHaveLength(1)
    expect(controllers).toContain(controller)
  })
})

describe('getController', () => {
  test('should return undefined for non-existent controller', () => {
    const controller = getController('/non-existent.js', 'v1')
    expect(controller).toBeUndefined()
  })

  test('should return the controller by scriptURL and version', async () => {
    using controller = createSvcWorkerController({
      scriptURL: '/controller/v1-circuit-breaker.js',
      version: 'v1',
      scope: '/controller/'
    })
    await controller.ready()

    const found = getController('/controller/v1-circuit-breaker.js', 'v1')
    expect(found).toBe(controller)
  })

  test('should return undefined for wrong version', async () => {
    using controller = createSvcWorkerController({
      scriptURL: '/controller/v1-circuit-breaker.js',
      version: 'v1',
      scope: '/controller/'
    })
    await controller.ready()

    const found = getController('/controller/v1-circuit-breaker.js', 'v2')
    expect(found).toBeUndefined()
  })
})

describe('disposeAllControllers', () => {
  test('should dispose all registered controllers', async () => {
    const controller = createSvcWorkerController({
      scriptURL: '/controller/v1-circuit-breaker.js',
      version: 'v1',
      scope: '/controller/'
    })
    await controller.ready()

    expect(getAllControllers()).toHaveLength(1)

    disposeAllControllers()

    expect(getAllControllers()).toHaveLength(0)
  })
})

describe('suspendServiceWorker', () => {
  test('should suspend a specific service worker', async () => {
    using controller = createSvcWorkerController({
      scriptURL: '/controller/v1-circuit-breaker.js',
      version: 'v1',
      scope: '/controller/'
    })
    const mockSuspendHandler = vi.fn()
    controller.on('suspended', mockSuspendHandler)
    await controller.ready()
    expect(controller.state).toBe('activated')

    const result = await suspendServiceWorker('/controller/v1-circuit-breaker.js', 'v1')

    expect(result.mode).toBe('suspend')
    expect(result.terminated).toBe(false)
    expect(controller.state).toBe('suspended')
    expect(mockSuspendHandler).toHaveBeenCalledTimes(1)
  })

  test('should throw error for non-existent controller', async () => {
    await expect(suspendServiceWorker('/non-existent.js', 'v1')).rejects.toThrow(
      'Controller not found for /non-existent.js::v1'
    )
  })

  test('should suspend with clearCaches option', async () => {
    using controller = createSvcWorkerController({
      scriptURL: '/controller/v1-circuit-breaker.js',
      version: 'v1',
      scope: '/controller/'
    })
    await controller.ready()

    const result = await suspendServiceWorker('/controller/v1-circuit-breaker.js', 'v1', {
      clearCaches: true
    })

    expect(result.mode).toBe('suspend')
    expect(result.cachesCleared).toBeDefined()
    expect(Array.isArray(result.cachesCleared)).toBe(true)
  })
})

describe('suspendAllServiceWorkers', () => {
  test('should suspend all activated service workers', async () => {
    using controller = createSvcWorkerController({
      scriptURL: '/controller/v1-circuit-breaker.js',
      version: 'v1',
      scope: '/controller/'
    })
    const mockSuspendHandler = vi.fn()
    controller.on('suspended', mockSuspendHandler)
    await controller.ready()

    const results = await suspendAllServiceWorkers()

    expect(results.size).toBe(1)
    expect(controller.state).toBe('suspended')
    expect(mockSuspendHandler).toHaveBeenCalledTimes(1)
  })

  test('should return empty map when no controllers are registered', async () => {
    const results = await suspendAllServiceWorkers()
    expect(results.size).toBe(0)
  })
})

describe('resumeServiceWorker', () => {
  test('should resume a suspended service worker', async () => {
    using controller = createSvcWorkerController({
      scriptURL: '/controller/v1-circuit-breaker.js',
      version: 'v1',
      scope: '/controller/'
    })
    const mockResumeHandler = vi.fn()
    controller.on('resumed', mockResumeHandler)
    await controller.ready()
    await controller.suspend()
    expect(controller.state).toBe('suspended')

    const result = await resumeServiceWorker('/controller/v1-circuit-breaker.js', 'v1')

    expect(result).toBeDefined()
    expect(controller.state).toBe('activated')
    expect(mockResumeHandler).toHaveBeenCalledTimes(1)
  })

  test('should throw error for non-existent controller', async () => {
    await expect(resumeServiceWorker('/non-existent.js', 'v1')).rejects.toThrow(
      'Controller not found for /non-existent.js::v1'
    )
  })
})

describe('resumeAllServiceWorkers', () => {
  test('should resume all suspended service workers', async () => {
    using controller = createSvcWorkerController({
      scriptURL: '/controller/v1-circuit-breaker.js',
      version: 'v1',
      scope: '/controller/'
    })
    const mockResumeHandler = vi.fn()
    controller.on('resumed', mockResumeHandler)
    await controller.ready()
    await controller.suspend()

    expect(controller.state).toBe('suspended')

    const results = await resumeAllServiceWorkers()

    expect(results.size).toBe(1)
    expect(controller.state).toBe('activated')
    expect(mockResumeHandler).toHaveBeenCalledTimes(1)
  })

  test('should not resume non-suspended controllers', async () => {
    using controller = createSvcWorkerController({
      scriptURL: '/controller/v1-circuit-breaker.js',
      version: 'v1',
      scope: '/controller/'
    })
    await controller.ready()
    // controller is NOT suspended

    const results = await resumeAllServiceWorkers()

    expect(results.size).toBe(0)
    expect(controller.state).toBe('activated')
  })
})

describe('terminateServiceWorker', () => {
  test('should terminate a specific service worker', async () => {
    using controller = createSvcWorkerController({
      scriptURL: '/controller/v1-circuit-breaker.js',
      version: 'v1',
      scope: '/controller/'
    })
    const mockTerminateHandler = vi.fn()
    controller.on('terminated', mockTerminateHandler)
    await controller.ready()
    expect(controller.state).toBe('activated')

    const result = await terminateServiceWorker('/controller/v1-circuit-breaker.js', 'v1')

    expect(result.mode).toBe('terminate')
    expect(result.terminated).toBe(true)

    expect(controller.state).toBe('terminated')
    expect(mockTerminateHandler).toHaveBeenCalledWith('unregister')
  })

  test('should throw error for non-existent controller', async () => {
    await expect(terminateServiceWorker('/non-existent.js', 'v1')).rejects.toThrow(
      'Controller not found for /non-existent.js::v1'
    )
  })

  test('should terminate with clearCaches option', async () => {
    using controller = createSvcWorkerController({
      scriptURL: '/controller/v1-circuit-breaker.js',
      version: 'v1',
      scope: '/controller/'
    })
    await controller.ready()

    const result = await terminateServiceWorker('/controller/v1-circuit-breaker.js', 'v1', {
      clearCaches: true
    })

    expect(result.mode).toBe('terminate')
    expect(result.terminated).toBe(true)
    expect(result.cachesCleared).toBeDefined()

    expect(controller.state).toBe('terminated')
  })
})
