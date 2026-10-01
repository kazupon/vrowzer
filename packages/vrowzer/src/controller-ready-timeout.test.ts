import { V_SW_LISTEN_READY } from '@vrowzer/vite-dev-server/messages'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'

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

describe('initServiceWorker abort', () => {
  const reason = new Error('disposed')

  function mockListeningController() {
    const postMessage = vi.fn<(message: unknown) => void>()
    const listeners = new Set<(event: MessageEvent) => void>()
    const container = {
      addEventListener(_type: string, listener: (event: MessageEvent) => void) {
        listeners.add(listener)
      },
      removeEventListener(_type: string, listener: (event: MessageEvent) => void) {
        listeners.delete(listener)
      }
    }
    createSvcWorkerControllerMock.mockReturnValue({
      ready: vi.fn<SvcWorkerController['ready']>(async () => true),
      serviceWorker: { postMessage },
      container
    } as unknown as SvcWorkerController)
    return { postMessage, listeners }
  }

  beforeEach(() => {
    createSvcWorkerControllerMock.mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('rejects without creating a controller when the signal is already aborted', async () => {
    const abortController = new AbortController()
    abortController.abort(reason)

    await expect(initServiceWorker({ ...options, signal: abortController.signal })).rejects.toBe(
      reason
    )
    expect(createSvcWorkerControllerMock).not.toHaveBeenCalled()
  })

  test('rejects while waiting for the controller to become ready', async () => {
    mockReady().mockReturnValue(new Promise<boolean>(() => {}))
    const abortController = new AbortController()

    const initialization = initServiceWorker({ ...options, signal: abortController.signal })
    abortController.abort(reason)

    await expect(initialization).rejects.toBe(reason)
  })

  test('stops polling for listen() when aborted', async () => {
    const { postMessage, listeners } = mockListeningController()
    const abortController = new AbortController()

    const initialization = initServiceWorker({ ...options, signal: abortController.signal })
    await vi.advanceTimersByTimeAsync(1000)
    expect(postMessage).toHaveBeenCalled()
    expect(listeners.size).toBe(1)

    abortController.abort(reason)

    await expect(initialization).rejects.toBe(reason)
    expect(listeners.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    const pingCount = postMessage.mock.calls.length
    await vi.advanceTimersByTimeAsync(2000)
    expect(postMessage).toHaveBeenCalledTimes(pingCount)
  })

  test('ignores an abort after listen() completes', async () => {
    const { listeners } = mockListeningController()
    const abortController = new AbortController()

    const initialization = initServiceWorker({ ...options, signal: abortController.signal })
    await vi.advanceTimersByTimeAsync(0)
    for (const listener of listeners) {
      listener({ data: { type: V_SW_LISTEN_READY } } as MessageEvent)
    }

    await expect(initialization).resolves.toBeDefined()
    expect(vi.getTimerCount()).toBe(0)
    abortController.abort(reason)
    await expect(initialization).resolves.toBeDefined()
  })
})
