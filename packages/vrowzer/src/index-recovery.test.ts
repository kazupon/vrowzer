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
  files?: Record<string, string>
  binaryFiles?: Record<string, ArrayBuffer>
  runtimeId?: string
}

interface AckError {
  name: string
  message: string
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
let replies: { webWorkerAcks: boolean; serviceWorkerAcks: boolean; channel: boolean }

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

  private reply(data: object): void {
    queueMicrotask(() => this.onmessage?.({ data } as MessageEvent))
  }

  terminate(): void {}
}

function fromServiceWorker(data: object): void {
  controllerMocks.container.dispatchEvent(new MessageEvent('message', { data }))
}

function ackFromServiceWorker(id: string, error?: AckError): void {
  fromServiceWorker({ type: 'V_FS_ACK', id, ...(error ? { error } : {}) })
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

/**
 * The V_FS_INIT messages that restore the Service Worker. The one of ready() has no id.
 */
function recoveryInits(): (TestMessage & { id: string })[] {
  return serviceWorkerMessages('V_FS_INIT').filter(
    (message): message is TestMessage & { id: string } => message.id !== undefined
  )
}

async function flush(): Promise<void> {
  for (let index = 0; index < 20; index++) {
    await Promise.resolve()
  }
}

async function isPending(promise: Promise<unknown>): Promise<boolean> {
  let settled = false
  promise.then(
    () => {
      settled = true
    },
    () => {
      settled = true
    }
  )
  await flush()
  return !settled
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
  replies = { webWorkerAcks: true, serviceWorkerAcks: true, channel: true }
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
    if (message.type === V_WW_CONNECT_PORT) {
      if (replies.channel) {
        queueMicrotask(() => fromServiceWorker({ type: V_WW_CONNECT_PORT_ACK }))
      }
      return
    }
    const id = message.id
    if (replies.serviceWorkerAcks && id !== undefined) {
      queueMicrotask(() => ackFromServiceWorker(id))
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
    test('restores the project when a Service Worker instance with another id starts', async () => {
      const { worker, recovered, recoveryErrors } = await readyInstance({ '/main.js': 'export {}' })
      controllerMocks.postMessage.mockClear()
      worker.messages.length = 0

      startServiceWorkerInstance('sw-2')

      await vi.waitFor(() => {
        expect(recovered).toHaveBeenCalledOnce()
      })
      expect(recoveryErrors).not.toHaveBeenCalled()
      expect(serviceWorkerMessages().map(message => message.type)).toEqual([
        'V_FS_INIT',
        V_WW_CONNECT_PORT
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

    test('restores the project after ready() when an instance started during ready()', async () => {
      const postMessage = controllerMocks.postMessage.getMockImplementation()!
      controllerMocks.postMessage.mockImplementation((message, transfer) => {
        // The Service Worker restarts right after it got the files of ready()
        if (message.type === 'V_FS_INIT' && message.id === undefined) {
          startServiceWorkerInstance('sw-2')
        }
        postMessage(message, transfer)
      })

      const { recovered } = await readyInstance()

      await vi.waitFor(() => {
        expect(recovered).toHaveBeenCalledOnce()
      })
      expect(recoveryInits()).toHaveLength(1)
    })
  })

  describe('restored contents', () => {
    test('sends the latest files to the Service Worker only, with an id', async () => {
      const { vrowzer, worker, recovered } = await readyInstance({
        '/a.js': 'a',
        '/b.bin': new Uint8Array([1, 2]).buffer,
        '/c.js': 'c'
      })
      await vrowzer.addFile('/d.js', 'd')
      await vrowzer.updateFile('/a.js', 'a2')
      await vrowzer.deleteFile('/c.js')
      await vrowzer.updateFile('/b.bin', new Uint8Array([3, 4]).buffer)

      startServiceWorkerInstance('sw-2')

      await vi.waitFor(() => {
        expect(recovered).toHaveBeenCalledOnce()
      })
      const [init] = recoveryInits()
      expect(init).toEqual({
        type: 'V_FS_INIT',
        id: expect.any(String),
        files: {
          '/a.js': 'a2',
          '/d.js': 'd',
          '/index.html': expect.stringContaining('<div id="app"></div>'),
          '/dist/client/client.mjs': 'client code',
          '/dist/client/env.mjs': 'env code'
        },
        binaryFiles: { '/b.bin': expect.any(ArrayBuffer) }
      })
      expect([...new Uint8Array(init!.binaryFiles!['/b.bin']!)]).toEqual([3, 4])
      expect(webWorkerMessages(worker, 'V_FS_INIT')).toEqual([])
    })

    test('connects the Web Worker channel again after the Service Worker applied the files', async () => {
      const { worker, recovered } = await readyInstance()
      const [firstConnection] = serviceWorkerMessages(V_WW_CONNECT_PORT)
      replies.serviceWorkerAcks = false

      startServiceWorkerInstance('sw-2')
      await flush()
      expect(recoveryInits()).toHaveLength(1)
      expect(serviceWorkerMessages(V_WW_CONNECT_PORT)).toHaveLength(1)
      expect(webWorkerMessages(worker, V_SW_CONNECT_PORT)).toHaveLength(1)

      ackFromServiceWorker(recoveryInits()[0]!.id)

      await vi.waitFor(() => {
        expect(recovered).toHaveBeenCalledOnce()
      })
      const connections = serviceWorkerMessages(V_WW_CONNECT_PORT)
      expect(connections).toHaveLength(2)
      expect(firstConnection!.runtimeId).toEqual(expect.any(String))
      expect(connections[1]!.runtimeId).toBe(firstConnection!.runtimeId)
      expect(webWorkerMessages(worker, V_SW_CONNECT_PORT)).toHaveLength(2)
    })
  })

  describe('file operations', () => {
    test('settles an operation sent before the restart when the restored files are applied', async () => {
      const { vrowzer, recovered } = await readyInstance()
      replies.serviceWorkerAcks = false
      const updating = vrowzer.updateFile('/a.js', 'v1')
      expect(await isPending(updating)).toBe(true)

      startServiceWorkerInstance('sw-2')
      await flush()
      const [init] = recoveryInits()
      expect(init!.files!['/a.js']).toBe('v1')
      expect(await isPending(updating)).toBe(true)

      ackFromServiceWorker(init!.id)

      await expect(updating).resolves.toBeUndefined()
      await vi.waitFor(() => {
        expect(recovered).toHaveBeenCalledOnce()
      })
    })

    test('sends the operations called during the recovery after it, in order', async () => {
      const { vrowzer, worker, recovered } = await readyInstance({ '/a.js': 'v1', '/b.js': 'b' })
      replies.serviceWorkerAcks = false
      startServiceWorkerInstance('sw-2')
      await flush()

      const updating = vrowzer.updateFile('/a.js', 'v2')
      const deleting = vrowzer.deleteFile('/b.js')
      await flush()
      expect(fileChanges(serviceWorkerMessages())).toEqual([])
      expect(fileChanges(worker.messages)).toEqual([])
      const [init] = recoveryInits()
      expect(init!.files).toMatchObject({ '/a.js': 'v1', '/b.js': 'b' })

      replies.serviceWorkerAcks = true
      ackFromServiceWorker(init!.id)

      await expect(updating).resolves.toBeUndefined()
      await expect(deleting).resolves.toBeUndefined()
      expect(recovered).toHaveBeenCalledOnce()
      const expected = [
        expect.objectContaining({ type: 'V_FS_WRITE', path: '/a.js', content: 'v2' }),
        expect.objectContaining({ type: 'V_FS_UNLINK', path: '/b.js' })
      ]
      expect(fileChanges(serviceWorkerMessages())).toEqual(expected)
      expect(fileChanges(worker.messages)).toEqual(expected)
    })

    test('counts the timeout of a held operation from when it is sent', async () => {
      vi.useFakeTimers()
      const { vrowzer } = await readyInstance({}, { fileSyncTimeout: 1000 })
      replies.serviceWorkerAcks = false
      replies.webWorkerAcks = false
      startServiceWorkerInstance('sw-2')
      await flush()
      const updating = vrowzer.updateFile('/a.js', 'v2')
      const result = updating.catch((error: unknown) => error)

      await vi.advanceTimersByTimeAsync(900)
      ackFromServiceWorker(recoveryInits()[0]!.id)
      await flush()
      expect(fileChanges(serviceWorkerMessages())).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(999)
      expect(await isPending(updating)).toBe(true)
      await vi.advanceTimersByTimeAsync(1)

      expect(await result).toEqual(
        expect.objectContaining({ message: expect.stringContaining('timed out after 1000ms') })
      )
    })

    test('copies binary content when the operation is called', async () => {
      const { vrowzer, recovered } = await readyInstance()
      replies.serviceWorkerAcks = false
      startServiceWorkerInstance('sw-2')
      await flush()
      const buffer = new Uint8Array([1, 2, 3]).buffer

      const writing = vrowzer.updateFile('/data.bin', buffer)
      new Uint8Array(buffer).fill(9)
      replies.serviceWorkerAcks = true
      ackFromServiceWorker(recoveryInits()[0]!.id)

      await expect(writing).resolves.toBeUndefined()
      const [message] = fileChanges(serviceWorkerMessages())
      expect([...new Uint8Array(message!.content as ArrayBuffer)]).toEqual([1, 2, 3])
      // The copy kept to restore the Service Worker has the same bytes
      startServiceWorkerInstance('sw-3')
      await vi.waitFor(() => {
        expect(recovered).toHaveBeenCalledTimes(2)
      })
      expect([...new Uint8Array(recoveryInits()[1]!.binaryFiles!['/data.bin']!)]).toEqual([1, 2, 3])
    })
  })

  describe('failures', () => {
    test('reports a recovery that does not finish within fileSyncTimeout', async () => {
      vi.useFakeTimers()
      const { vrowzer, recovered, recoveryErrors } = await readyInstance(
        {},
        { fileSyncTimeout: 1000 }
      )
      replies.serviceWorkerAcks = false
      startServiceWorkerInstance('sw-2')
      await flush()
      const result = vrowzer.updateFile('/a.js', 'v2').catch((error: unknown) => error)

      await vi.advanceTimersByTimeAsync(1000)

      expect(recoveryErrors).toHaveBeenCalledOnce()
      const [error] = recoveryErrors.mock.calls[0]!
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('timed out after 1000ms')
      expect(recovered).not.toHaveBeenCalled()
      expect(await result).toEqual(
        expect.objectContaining({
          message: expect.stringMatching(/updateFile\("\/a\.js"\).*restarted Service Worker/)
        })
      )
      expect(fileChanges(serviceWorkerMessages())).toEqual([])
    })

    test('reports a Service Worker that fails to apply the restored files', async () => {
      const { vrowzer, recovered, recoveryErrors } = await readyInstance()
      replies.serviceWorkerAcks = false
      const sent = vrowzer.updateFile('/a.js', 'v1')
      startServiceWorkerInstance('sw-2')
      await flush()
      const held = vrowzer.updateFile('/a.js', 'v2')

      ackFromServiceWorker(recoveryInits()[0]!.id, { name: 'Error', message: 'disk full' })

      await expect(sent).rejects.toThrow('disk full')
      await expect(held).rejects.toThrow('disk full')
      expect(recoveryErrors).toHaveBeenCalledOnce()
      expect(recoveryErrors.mock.calls[0]![0].message).toContain('disk full')
      expect(recovered).not.toHaveBeenCalled()
      expect(serviceWorkerMessages(V_WW_CONNECT_PORT)).toHaveLength(1)
    })

    test('sends operations as usual after a failed recovery, and tries again on the next start', async () => {
      const { vrowzer, recovered, recoveryErrors } = await readyInstance()
      replies.serviceWorkerAcks = false
      startServiceWorkerInstance('sw-2')
      await flush()
      ackFromServiceWorker(recoveryInits()[0]!.id, { name: 'Error', message: 'disk full' })
      await vi.waitFor(() => {
        expect(recoveryErrors).toHaveBeenCalledOnce()
      })

      replies.serviceWorkerAcks = true
      await expect(vrowzer.updateFile('/a.js', 'after the failure')).resolves.toBeUndefined()
      startServiceWorkerInstance('sw-3')

      await vi.waitFor(() => {
        expect(recovered).toHaveBeenCalledOnce()
      })
      expect(recoveryInits()[1]!.files!['/a.js']).toBe('after the failure')
    })
  })

  describe('overlaps', () => {
    test('restores the newest instance when another one starts during a recovery', async () => {
      const { vrowzer, recovered, recoveryErrors } = await readyInstance()
      replies.serviceWorkerAcks = false
      startServiceWorkerInstance('sw-2')
      await flush()
      startServiceWorkerInstance('sw-3')
      await flush()
      const [first, second] = recoveryInits()
      expect(second).toBeDefined()

      ackFromServiceWorker(first!.id)
      await flush()
      expect(serviceWorkerMessages(V_WW_CONNECT_PORT)).toHaveLength(1)
      ackFromServiceWorker(second!.id)

      await vi.waitFor(() => {
        expect(recovered).toHaveBeenCalledOnce()
      })
      expect(recoveryErrors).not.toHaveBeenCalled()
      // The acknowledgements of the Web Worker still arrive
      replies.serviceWorkerAcks = true
      await expect(vrowzer.updateFile('/a.js', 'v2')).resolves.toBeUndefined()
    })
  })

  describe('dispose()', () => {
    test('stops the recovery and sends nothing more', async () => {
      const { vrowzer } = await readyInstance()
      replies.serviceWorkerAcks = false
      startServiceWorkerInstance('sw-2')
      await flush()
      const held = vrowzer.updateFile('/a.js', 'v2')

      const disposing = vrowzer.dispose()
      await expect(held).rejects.toThrow('cancelled by dispose()')
      ackFromServiceWorker(recoveryInits()[0]!.id)
      await disposing
      await flush()

      expect(serviceWorkerMessages(V_WW_CONNECT_PORT)).toHaveLength(1)
      expect(fileChanges(serviceWorkerMessages())).toEqual([])
      startServiceWorkerInstance('sw-3')
      await flush()
      expect(recoveryInits()).toHaveLength(1)
    })
  })
})
