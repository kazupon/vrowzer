import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import {
  V_SW_CONNECT_PORT,
  V_SW_CONNECT_PORT_ACK,
  V_SW_INSTANCE_STARTED,
  V_WW_CONNECT_PORT,
  V_WW_CONNECT_PORT_ACK,
  V_WW_READY,
  V_WW_SETUP,
  V_WW_SETUP_ACK
} from '@vrowzer/vite-dev-server/messages'

interface TestMessage {
  type: string
  id?: string
  path?: string
  content?: unknown
  runtimeId?: string
}

const controllerMocks = vi.hoisted(() => ({
  container: new EventTarget(),
  on: vi.fn<(...args: unknown[]) => () => void>(() => () => {}),
  postMessage: vi.fn<(message: TestMessage, transfer?: Transferable[]) => void>(),
  initServiceWorker: vi.fn<() => Promise<undefined>>(async () => undefined)
}))

vi.mock('./controller.ts', () => ({
  getController: () => controllerMocks,
  getServiceWorker: () => ({ postMessage: controllerMocks.postMessage }),
  getServiceWorkerInstanceId: () => 'sw-1',
  initServiceWorker: controllerMocks.initServiceWorker
}))
vi.mock('@vrowzer/vite-dev-server/dist/client/client.mjs?raw', () => ({ default: 'client code' }))
vi.mock('@vrowzer/vite-dev-server/dist/client/env.mjs?raw', () => ({ default: 'env code' }))

import { Vrowzer, type VrowzerOptions } from './index.ts'

let workers: TestWorker[]
// What the fake Workers answer by themselves
let replies: { webWorkerAcks: boolean; channel: boolean }

class TestWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  readonly messages: TestMessage[] = []

  constructor() {
    workers.push(this)
    this.reply({ type: V_WW_READY })
  }

  postMessage(message: TestMessage): void {
    this.messages.push(message)
    if (message.type === V_WW_SETUP) {
      this.reply({ type: V_WW_SETUP_ACK })
    } else if (message.type === V_SW_CONNECT_PORT) {
      if (replies.channel) {
        this.reply({ type: V_SW_CONNECT_PORT_ACK })
      }
    } else if (replies.webWorkerAcks && message.id !== undefined) {
      this.reply({ type: 'V_FS_ACK', id: message.id })
    }
  }

  /**
   * Completes a channel handshake that it did not answer by itself.
   */
  acceptChannel(): void {
    this.onmessage?.({ data: { type: V_SW_CONNECT_PORT_ACK } } as MessageEvent)
  }

  private reply(data: object): void {
    queueMicrotask(() => this.onmessage?.({ data } as MessageEvent))
  }

  terminate(): void {}
}

function fromServiceWorker(data: object): void {
  controllerMocks.container.dispatchEvent(new MessageEvent('message', { data }))
}

function startServiceWorkerInstance(instanceId: string): void {
  fromServiceWorker({ type: V_SW_INSTANCE_STARTED, instanceId })
}

function serviceWorkerMessages(type?: string): TestMessage[] {
  return controllerMocks.postMessage.mock.calls
    .map(([message]) => message)
    .filter(message => type === undefined || message.type === type)
}

function webWorkerMessages(worker: TestWorker, type: string): TestMessage[] {
  return worker.messages.filter(message => message.type === type)
}

function fileChanges(messages: TestMessage[]): TestMessage[] {
  return messages.filter(message => message.type === 'V_FS_WRITE' || message.type === 'V_FS_UNLINK')
}

async function flush(): Promise<void> {
  for (let index = 0; index < 20; index++) {
    await Promise.resolve()
  }
}

async function readyInstance(
  files: Record<string, string | ArrayBuffer> = {},
  options?: VrowzerOptions
) {
  const vrowzer = Vrowzer(options)
  const recovered = vi.fn<() => void>()
  const recoveryErrors = vi.fn<(error: Error) => void>()
  vrowzer.on('serviceWorkerRecovered', recovered)
  vrowzer.on('serviceWorkerRecoveryError', recoveryErrors)
  await expect(vrowzer.ready({ files })).resolves.toBe(true)
  return { vrowzer, worker: workers.at(-1)!, recovered, recoveryErrors }
}

beforeEach(() => {
  vi.clearAllMocks()
  workers = []
  replies = { webWorkerAcks: true, channel: true }
  controllerMocks.container = new EventTarget()
  vi.stubGlobal('Worker', TestWorker)
  vi.stubGlobal(
    'MessageChannel',
    class {
      port1 = {}
      port2 = {}
    }
  )
  controllerMocks.postMessage.mockImplementation(message => {
    if (message.type === V_WW_CONNECT_PORT && replies.channel) {
      queueMicrotask(() => fromServiceWorker({ type: V_WW_CONNECT_PORT_ACK }))
    }
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Vrowzer Service Worker recovery', () => {
  describe('detection', () => {
    test('connects the Web Worker channel again when a Service Worker instance with another id starts', async () => {
      const { worker, recovered, recoveryErrors } = await readyInstance({ '/main.js': 'export {}' })
      const [firstConnection] = serviceWorkerMessages(V_WW_CONNECT_PORT)
      controllerMocks.postMessage.mockClear()
      worker.messages.length = 0

      startServiceWorkerInstance('sw-2')

      await vi.waitFor(() => {
        expect(recovered).toHaveBeenCalledOnce()
      })
      expect(recoveryErrors).not.toHaveBeenCalled()
      // The Web Worker still has the files, so only the channel is connected again
      expect(serviceWorkerMessages()).toEqual([
        { type: V_WW_CONNECT_PORT, runtimeId: firstConnection!.runtimeId }
      ])
      expect(worker.messages.map(message => message.type)).toEqual([V_SW_CONNECT_PORT])
    })

    test('ignores a start notice of the instance it knows', async () => {
      const { recovered } = await readyInstance()
      controllerMocks.postMessage.mockClear()

      startServiceWorkerInstance('sw-1')
      await flush()

      expect(serviceWorkerMessages()).toEqual([])
      expect(recovered).not.toHaveBeenCalled()
    })

    test('ignores start notices after ready() failed', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      controllerMocks.postMessage.mockImplementationOnce(() => {
        throw new Error('cannot post')
      })
      const vrowzer = Vrowzer()
      await expect(vrowzer.ready({ files: {} })).resolves.toBe(false)
      controllerMocks.postMessage.mockClear()

      startServiceWorkerInstance('sw-2')
      await flush()

      expect(serviceWorkerMessages()).toEqual([])
    })

    test('ignores start notices after dispose()', async () => {
      const { vrowzer } = await readyInstance()
      await vrowzer.dispose()
      controllerMocks.postMessage.mockClear()

      startServiceWorkerInstance('sw-2')
      await flush()

      expect(serviceWorkerMessages()).toEqual([])
    })

    test('connects the channel again after ready() when an instance started during ready()', async () => {
      const postMessage = controllerMocks.postMessage.getMockImplementation()!
      controllerMocks.postMessage.mockImplementation((message, transfer) => {
        // The Service Worker restarts right after it got the channel of ready()
        if (
          message.type === V_WW_CONNECT_PORT &&
          serviceWorkerMessages(V_WW_CONNECT_PORT).length === 1
        ) {
          startServiceWorkerInstance('sw-2')
        }
        postMessage(message, transfer)
      })

      const { recovered } = await readyInstance()

      await vi.waitFor(() => {
        expect(recovered).toHaveBeenCalledOnce()
      })
      expect(serviceWorkerMessages(V_WW_CONNECT_PORT)).toHaveLength(2)
    })
  })

  describe('file operations', () => {
    test('sends the operations called during a recovery to the Web Worker right away', async () => {
      const { vrowzer, worker, recovered } = await readyInstance({ '/a.js': 'v1', '/b.js': 'b' })
      replies.channel = false
      startServiceWorkerInstance('sw-2')
      await flush()

      await expect(vrowzer.updateFile('/a.js', 'v2')).resolves.toBeUndefined()
      await expect(vrowzer.deleteFile('/b.js')).resolves.toBeUndefined()

      expect(fileChanges(worker.messages)).toEqual([
        expect.objectContaining({ type: 'V_FS_WRITE', path: '/a.js', content: 'v2' }),
        expect.objectContaining({ type: 'V_FS_UNLINK', path: '/b.js' })
      ])
      expect(fileChanges(serviceWorkerMessages())).toEqual([])
      expect(recovered).not.toHaveBeenCalled()

      fromServiceWorker({ type: V_WW_CONNECT_PORT_ACK })
      worker.acceptChannel()
      await vi.waitFor(() => {
        expect(recovered).toHaveBeenCalledOnce()
      })
    })
  })

  describe('failures', () => {
    test('reports a recovery that does not finish within fileSyncTimeout', async () => {
      vi.useFakeTimers()
      const { vrowzer, recovered, recoveryErrors } = await readyInstance(
        {},
        { fileSyncTimeout: 1000 }
      )
      replies.channel = false
      startServiceWorkerInstance('sw-2')
      await flush()

      await vi.advanceTimersByTimeAsync(1000)

      expect(recoveryErrors).toHaveBeenCalledOnce()
      const [error] = recoveryErrors.mock.calls[0]!
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('timed out after 1000ms')
      expect(recovered).not.toHaveBeenCalled()
      // File operations do not wait for the Service Worker
      await expect(vrowzer.updateFile('/a.js', 'v2')).resolves.toBeUndefined()
    })

    test('tries again on the next start after a failed recovery', async () => {
      vi.useFakeTimers()
      const { recovered, recoveryErrors } = await readyInstance({}, { fileSyncTimeout: 1000 })
      replies.channel = false
      startServiceWorkerInstance('sw-2')
      await vi.advanceTimersByTimeAsync(1000)
      expect(recoveryErrors).toHaveBeenCalledOnce()

      replies.channel = true
      startServiceWorkerInstance('sw-3')

      await vi.waitFor(() => {
        expect(recovered).toHaveBeenCalledOnce()
      })
      expect(serviceWorkerMessages(V_WW_CONNECT_PORT)).toHaveLength(3)
    })
  })

  describe('overlaps', () => {
    test('connects the newest instance when another one starts during a recovery', async () => {
      const { worker, recovered, recoveryErrors } = await readyInstance()
      replies.channel = false
      startServiceWorkerInstance('sw-2')
      await flush()
      startServiceWorkerInstance('sw-3')
      await flush()
      expect(serviceWorkerMessages(V_WW_CONNECT_PORT)).toHaveLength(3)
      expect(webWorkerMessages(worker, V_SW_CONNECT_PORT)).toHaveLength(3)

      fromServiceWorker({ type: V_WW_CONNECT_PORT_ACK })
      worker.acceptChannel()

      await vi.waitFor(() => {
        expect(recovered).toHaveBeenCalledOnce()
      })
      await flush()
      expect(recovered).toHaveBeenCalledOnce()
      expect(recoveryErrors).not.toHaveBeenCalled()
    })
  })

  describe('dispose()', () => {
    test('stops the recovery and connects nothing more', async () => {
      const { vrowzer, worker, recovered } = await readyInstance()
      replies.channel = false
      startServiceWorkerInstance('sw-2')
      await flush()

      await vrowzer.dispose()
      fromServiceWorker({ type: V_WW_CONNECT_PORT_ACK })
      worker.acceptChannel()
      await flush()

      expect(recovered).not.toHaveBeenCalled()
      expect(serviceWorkerMessages(V_WW_CONNECT_PORT)).toHaveLength(2)
      startServiceWorkerInstance('sw-3')
      await flush()
      expect(serviceWorkerMessages(V_WW_CONNECT_PORT)).toHaveLength(2)
    })
  })
})
