import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import { V_WW_READY, V_WW_SETUP, V_WW_SETUP_ACK } from '@vrowzer/vite-dev-server/messages'

const controllerMocks = vi.hoisted(() => ({
  getController: vi.fn<() => null>(() => null),
  getServiceWorker: vi.fn<() => null>(() => null),
  initServiceWorker: vi.fn<() => Promise<undefined>>(async () => undefined)
}))

vi.mock('./controller.ts', () => controllerMocks)
vi.mock('@vrowzer/vite-dev-server/dist/client/client.mjs?raw', () => ({ default: '' }))
vi.mock('@vrowzer/vite-dev-server/dist/client/env.mjs?raw', () => ({ default: '' }))

import { Vrowzer } from './index.ts'

class TestWorker {
  onerror: ((event: ErrorEvent) => void) | null = null
  terminate(): void {}
  private messageHandler: ((event: MessageEvent) => void) | null = null
  private readySent = false

  get onmessage(): ((event: MessageEvent) => void) | null {
    return this.messageHandler
  }

  set onmessage(handler: ((event: MessageEvent) => void) | null) {
    this.messageHandler = handler
    if (handler && !this.readySent) {
      this.readySent = true
      queueMicrotask(() => {
        this.messageHandler?.({ data: { type: V_WW_READY } } as MessageEvent)
      })
    }
  }

  postMessage(message: unknown): void {
    if (
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      message.type === V_WW_SETUP
    ) {
      queueMicrotask(() => {
        this.messageHandler?.({ data: { type: V_WW_SETUP_ACK } } as MessageEvent)
      })
    }
  }
}

describe('Vrowzer Service Worker ready timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('Worker', TestWorker)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  test('uses 60000ms by default', async () => {
    const vrowzer = Vrowzer()

    await expect(vrowzer.ready({ files: {} })).resolves.toBe(true)
    expect(controllerMocks.initServiceWorker).toHaveBeenCalledWith(
      expect.objectContaining({ readyTimeout: 60000 })
    )
  })

  test('forwards a custom timeout', async () => {
    const vrowzer = Vrowzer({ serviceWorkerReadyTimeout: 120000 })

    await expect(vrowzer.ready({ files: {} })).resolves.toBe(true)
    expect(controllerMocks.initServiceWorker).toHaveBeenCalledWith(
      expect.objectContaining({ readyTimeout: 120000 })
    )
  })

  test('preserves zero as an explicit timeout', async () => {
    const vrowzer = Vrowzer({ serviceWorkerReadyTimeout: 0 })

    await expect(vrowzer.ready({ files: {} })).resolves.toBe(true)
    expect(controllerMocks.initServiceWorker).toHaveBeenCalledWith(
      expect.objectContaining({ readyTimeout: 0 })
    )
  })

  test('preserves the ready boolean contract when Service Worker initialization fails', async () => {
    const failure = new Error('Service Worker controller did not become ready within 60000ms')
    controllerMocks.initServiceWorker.mockRejectedValueOnce(failure)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const vrowzer = Vrowzer()

    await expect(vrowzer.ready({ files: {} })).resolves.toBe(false)
    expect(consoleError).toHaveBeenCalledWith('[Vrowzer] ready() failed:', failure)
  })

  test('rejects concurrent and subsequent ready calls', async () => {
    const vrowzer = Vrowzer()

    const firstReady = vrowzer.ready({ files: {} })
    await expect(vrowzer.ready({ files: {} })).rejects.toThrow(
      'ready() can only be called once per instance (current state: initializing)'
    )
    await expect(firstReady).resolves.toBe(true)
    await expect(vrowzer.ready({ files: {} })).rejects.toThrow(
      'ready() can only be called once per instance (current state: ready)'
    )
  })
})
