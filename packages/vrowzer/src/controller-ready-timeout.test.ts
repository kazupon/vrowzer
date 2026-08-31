import { beforeEach, describe, expect, test, vi } from 'vite-plus/test'

import type { SvcWorkerController } from '@vrowzer/service-worker/controller'

type CreateSvcWorkerController =
  (typeof import('@vrowzer/service-worker/controller'))['createSvcWorkerController']

const createSvcWorkerControllerMock = vi.hoisted(() => vi.fn<CreateSvcWorkerController>())

vi.mock('@vrowzer/service-worker/controller', () => ({
  createSvcWorkerController: createSvcWorkerControllerMock
}))

import { initServiceWorker } from './controller.ts'

const options = {
  scriptURL: new URL('https://example.com/service-worker.js'),
  version: 'test-version',
  scope: '/',
  readyTimeout: 1234
}

function mockReady(): ReturnType<typeof vi.fn<SvcWorkerController['ready']>> {
  const ready = vi.fn<SvcWorkerController['ready']>()
  createSvcWorkerControllerMock.mockReturnValue({ ready } as unknown as SvcWorkerController)
  return ready
}

describe('initServiceWorker ready timeout', () => {
  beforeEach(() => {
    createSvcWorkerControllerMock.mockReset()
  })

  test('forwards the timeout and existing controller policies', async () => {
    const ready = mockReady().mockResolvedValue(false)

    await expect(initServiceWorker(options)).rejects.toThrow(
      'Service Worker controller did not become ready within 1234ms'
    )
    expect(ready).toHaveBeenCalledTimes(1)
    expect(ready).toHaveBeenCalledWith({
      timeout: 1234,
      skipWaitingPolicy: 'force',
      waitForController: true
    })
  })

  test('preserves errors thrown by the controller', async () => {
    const failure = new Error('registration failed')
    mockReady().mockRejectedValue(failure)

    await expect(initServiceWorker(options)).rejects.toBe(failure)
  })
})
