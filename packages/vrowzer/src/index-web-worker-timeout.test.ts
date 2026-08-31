import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import {
  V_WW_READY,
  V_WW_SETUP,
  V_WW_SETUP_ACK,
  V_WW_SETUP_ERROR
} from '@vrowzer/vite-dev-server/messages'

const controllerMocks = vi.hoisted(() => ({
  getController: vi.fn<() => null>(() => null),
  getServiceWorker: vi.fn<() => null>(() => null),
  initServiceWorker: vi.fn<() => Promise<undefined>>(async () => undefined)
}))

vi.mock('./controller.ts', () => controllerMocks)
vi.mock('@vrowzer/vite-dev-server/dist/client/client.mjs?raw', () => ({ default: '' }))
vi.mock('@vrowzer/vite-dev-server/dist/client/env.mjs?raw', () => ({ default: '' }))

import { Vrowzer, type VrowzerOptions } from './index.ts'

interface WorkerBehavior {
  readyDelay: number | null
  setupDelay: number | null
  setupError?: string
}

let behavior: WorkerBehavior
let workers: TestWorker[]

class TestWorker {
  onerror: ((event: ErrorEvent) => void) | null = null
  readonly messages: unknown[] = []
  readonly terminate = vi.fn<() => void>()
  private messageHandler: ((event: MessageEvent) => void) | null = null
  private readyScheduled = false

  constructor() {
    workers.push(this)
  }

  get onmessage(): ((event: MessageEvent) => void) | null {
    return this.messageHandler
  }

  set onmessage(handler: ((event: MessageEvent) => void) | null) {
    this.messageHandler = handler
    if (handler && !this.readyScheduled && behavior.readyDelay !== null) {
      this.readyScheduled = true
      setTimeout(() => {
        this.messageHandler?.({ data: { type: V_WW_READY } } as MessageEvent)
      }, behavior.readyDelay)
    }
  }

  postMessage(message: unknown): void {
    this.messages.push(message)
    if (
      behavior.setupDelay === null ||
      typeof message !== 'object' ||
      message === null ||
      !('type' in message) ||
      message.type !== V_WW_SETUP
    ) {
      return
    }

    setTimeout(() => {
      if (behavior.setupError) {
        this.messageHandler?.({
          data: {
            type: V_WW_SETUP_ERROR,
            error: { message: behavior.setupError }
          }
        } as MessageEvent)
        return
      }
      this.messageHandler?.({ data: { type: V_WW_SETUP_ACK } } as MessageEvent)
    }, behavior.setupDelay)
  }
}

async function startReady(options: VrowzerOptions = {}) {
  const vrowzer = Vrowzer(options)
  const ready = vrowzer.ready({ files: {} })
  for (let i = 0; i < 5; i++) {
    await vi.advanceTimersByTimeAsync(0)
  }
  return { ready, vrowzer, worker: workers[0]! }
}

describe('Vrowzer Web Worker setup timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    controllerMocks.initServiceWorker.mockResolvedValue(undefined)
    behavior = { readyDelay: 0, setupDelay: 0 }
    workers = []
    vi.stubGlobal('Worker', TestWorker)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  test('allows setup to complete after 30 seconds with the default timeout', async () => {
    behavior.setupDelay = 45_000
    const { ready, worker } = await startReady()

    await vi.advanceTimersByTimeAsync(45_000)

    await expect(ready).resolves.toBe(true)
    expect(worker.terminate).not.toHaveBeenCalled()
  })

  test('uses 90000ms by default', async () => {
    behavior.readyDelay = null
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { ready, worker } = await startReady()

    await vi.advanceTimersByTimeAsync(89_999)
    expect(worker.terminate).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    await expect(ready).resolves.toBe(false)
    expect(consoleError).toHaveBeenCalledWith(
      '[Vrowzer] ready() failed:',
      expect.objectContaining({ message: 'Web Worker setup timed out after 90000ms' })
    )
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  test('uses a custom timeout', async () => {
    behavior.readyDelay = null
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { ready, worker } = await startReady({ webWorkerSetupTimeout: 12_345 })

    await vi.advanceTimersByTimeAsync(12_344)
    expect(worker.terminate).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    await expect(ready).resolves.toBe(false)
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  test('preserves zero as an immediate timeout', async () => {
    behavior.readyDelay = null
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { ready, worker } = await startReady({ webWorkerSetupTimeout: 0 })

    await expect(ready).resolves.toBe(false)
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  test('terminates the Worker when setup reports an error', async () => {
    behavior.setupError = 'invalid worker config'
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { ready, worker } = await startReady()
    await vi.advanceTimersByTimeAsync(1)

    await expect(ready).resolves.toBe(false)
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  test('terminates the Worker when Service Worker initialization fails', async () => {
    const failure = new Error('Service Worker failed')
    controllerMocks.initServiceWorker.mockRejectedValueOnce(failure)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { ready, worker } = await startReady()

    await expect(ready).resolves.toBe(false)
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  test('removes a failed Worker from file-system publishing', async () => {
    behavior.readyDelay = null
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { ready, vrowzer, worker } = await startReady({ webWorkerSetupTimeout: 10 })
    await vi.advanceTimersByTimeAsync(10)
    await ready
    const messageCount = worker.messages.length

    vrowzer.updateFile('/main.ts', 'export const value = 1')

    expect(worker.messages).toHaveLength(messageCount)
  })

  test('keeps a successfully initialized Worker active', async () => {
    const { ready, vrowzer, worker } = await startReady()
    await vi.advanceTimersByTimeAsync(1)

    await expect(ready).resolves.toBe(true)
    const messageCount = worker.messages.length
    vrowzer.updateFile('/main.ts', 'export const value = 1')

    expect(worker.terminate).not.toHaveBeenCalled()
    expect(worker.messages.length).toBeGreaterThan(messageCount)
  })
})
