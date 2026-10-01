import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import {
  V_WW_READY,
  V_WW_SETUP,
  V_WW_SETUP_ACK,
  V_WW_CONNECT_PORT,
  V_WW_CONNECT_PORT_ACK,
  V_SW_CONNECT_PORT,
  V_SW_CONNECT_PORT_ACK
} from '@vrowzer/vite-dev-server/messages'

interface TestMessage {
  type: string
  id?: string
  path?: string
  content?: unknown
  files?: Record<string, string | ArrayBuffer>
  binaryFiles?: Record<string, ArrayBuffer>
}

interface AckError {
  name: string
  message: string
}

const controllerMocks = vi.hoisted(() => ({
  container: new EventTarget(),
  on: vi.fn<(...args: unknown[]) => () => void>(() => () => {}),
  postMessage: vi.fn<(message: { type: string }, transfer?: Transferable[]) => void>(),
  initServiceWorker: vi.fn<() => Promise<undefined>>(async () => undefined)
}))

vi.mock('./controller.ts', () => ({
  getController: () => controllerMocks,
  getServiceWorker: () => ({ postMessage: controllerMocks.postMessage }),
  initServiceWorker: controllerMocks.initServiceWorker
}))
vi.mock('@vrowzer/vite-dev-server/dist/client/client.mjs?raw', () => ({ default: 'client code' }))
vi.mock('@vrowzer/vite-dev-server/dist/client/env.mjs?raw', () => ({ default: 'env code' }))

import { Vrowzer, type VrowzerOptions } from './index.ts'

let workers: TestWorker[]
// Whether the fake Workers acknowledge file sync messages by themselves
let autoAck: boolean

class TestWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  readonly messages: TestMessage[] = []
  readonly transfers: (Transferable[] | undefined)[] = []

  constructor() {
    workers.push(this)
    this.reply({ type: V_WW_READY })
  }

  postMessage(message: TestMessage, transfer?: Transferable[]): void {
    this.messages.push(message)
    this.transfers.push(transfer)
    if (message.type === V_WW_SETUP) {
      this.reply({ type: V_WW_SETUP_ACK })
    } else if (message.type === V_SW_CONNECT_PORT) {
      this.reply({ type: V_SW_CONNECT_PORT_ACK })
    } else if (autoAck && message.id !== undefined) {
      this.reply({ type: 'V_FS_ACK', id: message.id })
    }
  }

  ack(id: string, error?: AckError): void {
    this.onmessage?.({
      data: { type: 'V_FS_ACK', id, ...(error ? { error } : {}) }
    } as MessageEvent)
  }

  private reply(data: object): void {
    queueMicrotask(() => this.onmessage?.({ data } as MessageEvent))
  }

  terminate(): void {}
}

function ackFromServiceWorker(id: string, error?: AckError): void {
  controllerMocks.container.dispatchEvent(
    new MessageEvent('message', { data: { type: 'V_FS_ACK', id, ...(error ? { error } : {}) } })
  )
}

function isFileChange(message: TestMessage): boolean {
  return message.type === 'V_FS_WRITE' || message.type === 'V_FS_UNLINK'
}

function webWorkerFileMessages(worker: TestWorker): TestMessage[] {
  return worker.messages.filter(isFileChange)
}

function serviceWorkerFileMessages(): TestMessage[] {
  return controllerMocks.postMessage.mock.calls
    .map(([message]) => message as TestMessage)
    .filter(isFileChange)
}

function lastId(worker: TestWorker): string {
  const id = webWorkerFileMessages(worker).at(-1)?.id
  if (!id) {
    throw new Error('No file sync message with an id was sent to the Web Worker')
  }
  return id
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
  // Replies settle operations synchronously, so a few microtasks are enough, even with fake timers
  for (let index = 0; index < 10; index++) {
    await Promise.resolve()
  }
  return !settled
}

async function readyInstance(options?: VrowzerOptions) {
  const vrowzer = Vrowzer(options)
  await expect(vrowzer.ready({ files: {} })).resolves.toBe(true)
  return { vrowzer, worker: workers.at(-1)! }
}

beforeEach(() => {
  vi.clearAllMocks()
  workers = []
  autoAck = false
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
      queueMicrotask(() => {
        controllerMocks.container.dispatchEvent(
          new MessageEvent('message', { data: { type: V_WW_CONNECT_PORT_ACK } })
        )
      })
      return
    }
    const id = (message as TestMessage).id
    if (autoAck && id !== undefined) {
      queueMicrotask(() => ackFromServiceWorker(id))
    }
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Vrowzer file synchronization', () => {
  test('initializes each Worker once without broadcasting initial files to the ready Web Worker', async () => {
    const files = { '/index.html': '<html></html>', '/main.js': 'export const value = 1' }
    const initialFiles = {
      ...files,
      '/dist/client/client.mjs': 'client code',
      '/dist/client/env.mjs': 'env code'
    }
    const vrowzer = Vrowzer()

    await expect(vrowzer.ready({ files })).resolves.toBe(true)

    expect(workers[0]!.messages).toEqual([
      expect.objectContaining({ type: V_WW_SETUP, files: initialFiles }),
      { type: V_SW_CONNECT_PORT }
    ])
    expect(controllerMocks.postMessage.mock.calls.map(([message]) => message)).toEqual([
      { type: 'V_FS_INIT', files: initialFiles },
      { type: V_WW_CONNECT_PORT }
    ])
  })

  test('gives both Workers the same default /index.html when ready() gets none', async () => {
    const vrowzer = Vrowzer()

    await expect(vrowzer.ready({ files: { '/main.js': 'export {}' } })).resolves.toBe(true)

    const webWorkerIndex = workers[0]!.messages[0]!.files!['/index.html']
    const init = controllerMocks.postMessage.mock.calls[0]![0] as TestMessage
    expect(webWorkerIndex).toBeTypeOf('string')
    expect(init.files!['/index.html']).toBe(webWorkerIndex)
    expect(webWorkerIndex).toContain('<div id="app"></div>')
    expect(webWorkerIndex).toContain('<script type="module" src="/main.js"></script>')
  })

  test('sends binary files to both Workers as copies, without transferring them', async () => {
    const bytes = [0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]
    const buffer = new Uint8Array(bytes).buffer
    const vrowzer = Vrowzer()

    await expect(
      vrowzer.ready({ files: { '/main.js': 'export {}', '/public/logo.png': buffer } })
    ).resolves.toBe(true)

    // The Web Worker writes each file by its type
    const setupFiles = workers[0]!.messages[0]!.files!
    expect(setupFiles['/main.js']).toBe('export {}')
    expect(setupFiles['/public/logo.png']).toBeInstanceOf(ArrayBuffer)
    expect(setupFiles['/public/logo.png']).not.toBe(buffer)
    expect([...new Uint8Array(setupFiles['/public/logo.png'] as ArrayBuffer)]).toEqual(bytes)
    expect(workers[0]!.transfers[0]).toBeUndefined()

    // The Service Worker gets the binary files in binaryFiles
    const [init, transfer] = controllerMocks.postMessage.mock.calls[0]!
    expect(init).toEqual({
      type: 'V_FS_INIT',
      files: {
        '/main.js': 'export {}',
        '/index.html': expect.stringContaining('<div id="app"></div>'),
        '/dist/client/client.mjs': 'client code',
        '/dist/client/env.mjs': 'env code'
      },
      binaryFiles: { '/public/logo.png': expect.any(ArrayBuffer) }
    })
    const serviceWorkerCopy = (init as TestMessage).binaryFiles!['/public/logo.png']!
    expect(serviceWorkerCopy).not.toBe(buffer)
    expect([...new Uint8Array(serviceWorkerCopy)]).toEqual(bytes)
    expect(transfer).toBeUndefined()

    // The caller's buffer is not detached
    expect(buffer.byteLength).toBe(bytes.length)
    expect([...new Uint8Array(buffer)]).toEqual(bytes)
  })

  test('sends the files as they were when ready() was called', async () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer
    const files: Record<string, string | ArrayBuffer> = { '/data.bin': buffer }
    const vrowzer = Vrowzer()

    const ready = vrowzer.ready({ files })
    new Uint8Array(buffer).fill(0)
    files['/late.js'] = 'export {}'
    await expect(ready).resolves.toBe(true)

    const setupFiles = workers[0]!.messages[0]!.files!
    expect(Object.keys(setupFiles)).not.toContain('/late.js')
    expect([...new Uint8Array(setupFiles['/data.bin'] as ArrayBuffer)]).toEqual([1, 2, 3])
    const init = controllerMocks.postMessage.mock.calls[0]![0] as TestMessage
    expect(Object.keys(init.files!)).not.toContain('/late.js')
    expect([...new Uint8Array(init.binaryFiles!['/data.bin']!)]).toEqual([1, 2, 3])
  })

  test('continues sending file additions, updates, and deletions to both Workers', async () => {
    autoAck = true
    const { vrowzer, worker } = await readyInstance()
    worker.messages.length = 0
    controllerMocks.postMessage.mockClear()

    await vrowzer.addFile('/main.js', 'initial')
    await vrowzer.updateFile('/main.js', 'updated')
    await vrowzer.deleteFile('/main.js')

    const expected = [
      {
        type: 'V_FS_WRITE',
        path: '/main.js',
        encoding: 'text',
        content: 'initial',
        id: expect.any(String)
      },
      {
        type: 'V_FS_WRITE',
        path: '/main.js',
        encoding: 'text',
        content: 'updated',
        id: expect.any(String)
      },
      { type: 'V_FS_UNLINK', path: '/main.js', id: expect.any(String) }
    ]
    expect(worker.messages).toEqual(expected)
    expect(controllerMocks.postMessage.mock.calls.map(([message]) => message)).toEqual(expected)
    // Each operation has its own id, shared by both Workers
    expect(new Set(worker.messages.map(message => message.id)).size).toBe(3)
    expect(serviceWorkerFileMessages().map(message => message.id)).toEqual(
      worker.messages.map(message => message.id)
    )
  })
})

describe('Vrowzer file operation results', () => {
  test.each(['Web Worker', 'Service Worker'] as const)(
    'resolves only after both Workers acknowledge, the %s first',
    async first => {
      const { vrowzer, worker } = await readyInstance()

      const updating = vrowzer.updateFile('/main.js', 'updated')
      const id = lastId(worker)
      expect(serviceWorkerFileMessages().at(-1)?.id).toBe(id)

      if (first === 'Web Worker') {
        worker.ack(id)
      } else {
        ackFromServiceWorker(id)
      }
      expect(await isPending(updating)).toBe(true)

      if (first === 'Web Worker') {
        ackFromServiceWorker(id)
      } else {
        worker.ack(id)
      }
      await expect(updating).resolves.toBeUndefined()
    }
  )

  test.each(['Web Worker', 'Service Worker'] as const)(
    'rejects with the operation, the path and the cause when the %s fails to apply it',
    async target => {
      const { vrowzer, worker } = await readyInstance()
      const error = { name: 'TypeError', message: 'watchChange failed' }

      const updating = vrowzer.updateFile('/main.js', 'updated')
      const id = lastId(worker)
      if (target === 'Web Worker') {
        worker.ack(id, error)
      } else {
        ackFromServiceWorker(id, error)
      }

      await expect(updating).rejects.toThrow(
        `[Vrowzer] updateFile("/main.js") failed in the ${target}: watchChange failed`
      )
      await expect(updating).rejects.toMatchObject({ cause: error })
      // A late reply from the other Worker does nothing
      worker.ack(id)
      ackFromServiceWorker(id)
    }
  )

  test('rejects after fileSyncTimeout and names the Workers that did not reply', async () => {
    vi.useFakeTimers()
    const { vrowzer, worker } = await readyInstance({ fileSyncTimeout: 1000 })

    const deleting = vrowzer.deleteFile('/main.js')
    ackFromServiceWorker(lastId(worker))
    const failure = deleting.catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(1000)

    expect(await failure).toMatchObject({
      message: '[Vrowzer] deleteFile("/main.js") timed out after 1000ms waiting for the Web Worker'
    })
    expect(vi.getTimerCount()).toBe(0)
  })

  test('waits 10 seconds for the replies by default', async () => {
    vi.useFakeTimers()
    const { vrowzer } = await readyInstance()

    const adding = vrowzer.addFile('/main.js', 'added')
    let settled = false
    adding.then(
      () => {
        settled = true
      },
      () => {
        settled = true
      }
    )
    await vi.advanceTimersByTimeAsync(9_999)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)

    await expect(adding).rejects.toThrow(
      '[Vrowzer] addFile("/main.js") timed out after 10000ms waiting for the Web Worker and the Service Worker'
    )
  })

  test('rejects the operations waiting for the Web Worker when it reports an error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { vrowzer, worker } = await readyInstance()

    const updating = vrowzer.updateFile('/main.js', 'updated')
    const updateId = lastId(worker)
    const adding = vrowzer.addFile('/other.js', 'other')
    const addId = lastId(worker)
    // This one only waits for the Service Worker
    worker.ack(addId)

    worker.onerror?.({ message: 'Uncaught ReferenceError: x is not defined' } as ErrorEvent)

    await expect(updating).rejects.toThrow(
      '[Vrowzer] updateFile("/main.js") failed because the Web Worker reported an error: Uncaught ReferenceError: x is not defined'
    )
    expect(consoleError).toHaveBeenCalled()
    expect(await isPending(adding)).toBe(true)
    ackFromServiceWorker(addId)
    await expect(adding).resolves.toBeUndefined()
    // A late reply for the rejected operation does nothing
    ackFromServiceWorker(updateId)
  })

  test('ignores unknown, repeated and late replies', async () => {
    const { vrowzer, worker } = await readyInstance()

    const updating = vrowzer.updateFile('/main.js', 'updated')
    const id = lastId(worker)
    worker.ack('unknown')
    ackFromServiceWorker('unknown')
    worker.onmessage?.({ data: { type: 'V_FS_OTHER', id } } as MessageEvent)
    worker.ack(id)
    // A second reply from the Web Worker does not stand in for the Service Worker
    worker.ack(id)
    expect(await isPending(updating)).toBe(true)

    ackFromServiceWorker(id)
    await expect(updating).resolves.toBeUndefined()

    // Replies after the operation settled do nothing
    worker.ack(id, { name: 'Error', message: 'late' })
    ackFromServiceWorker(id, { name: 'Error', message: 'late' })
    const deleting = vrowzer.deleteFile('/main.js')
    const nextId = lastId(worker)
    expect(nextId).not.toBe(id)
    worker.ack(nextId)
    ackFromServiceWorker(nextId)
    await expect(deleting).resolves.toBeUndefined()
  })

  test('does not settle an operation of another instance in the same page', async () => {
    const first = await readyInstance()
    const second = await readyInstance()

    const firstUpdate = first.vrowzer.updateFile('/a.js', 'a')
    const secondUpdate = second.vrowzer.updateFile('/b.js', 'b')
    const firstId = lastId(first.worker)
    const secondId = lastId(second.worker)

    // Both instances receive the Service Worker's replies through the same container
    first.worker.ack(firstId)
    ackFromServiceWorker(firstId)

    await expect(firstUpdate).resolves.toBeUndefined()
    expect(await isPending(secondUpdate)).toBe(true)
    second.worker.ack(secondId)
    ackFromServiceWorker(secondId)
    await expect(secondUpdate).resolves.toBeUndefined()
  })

  test('rejects before ready() without sending anything', async () => {
    const vrowzer = Vrowzer()

    await expect(vrowzer.updateFile('/main.js', 'updated')).rejects.toThrow(
      '[Vrowzer] updateFile() can only be called after ready() resolves to true (current state: idle)'
    )
    expect(controllerMocks.postMessage).not.toHaveBeenCalled()
  })

  test('rejects while ready() is in progress without sending anything', async () => {
    const vrowzer = Vrowzer()
    const ready = vrowzer.ready({ files: {} })

    await expect(vrowzer.addFile('/main.js', 'added')).rejects.toThrow(
      '[Vrowzer] addFile() can only be called after ready() resolves to true (current state: initializing)'
    )
    await expect(ready).resolves.toBe(true)
    expect(webWorkerFileMessages(workers[0]!)).toEqual([])
    expect(serviceWorkerFileMessages()).toEqual([])
  })

  test('rejects after ready() failed without sending anything', async () => {
    controllerMocks.initServiceWorker.mockRejectedValueOnce(new Error('Service Worker failed'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const vrowzer = Vrowzer()
    await expect(vrowzer.ready({ files: {} })).resolves.toBe(false)

    await expect(vrowzer.deleteFile('/main.js')).rejects.toThrow(
      '[Vrowzer] deleteFile() can only be called after ready() resolves to true (current state: failed)'
    )
    expect(webWorkerFileMessages(workers[0]!)).toEqual([])
    expect(serviceWorkerFileMessages()).toEqual([])
  })

  test('sends each Worker its own copy of binary content', async () => {
    const { vrowzer, worker } = await readyInstance()
    const buffer = new Uint8Array([1, 2, 3]).buffer

    const adding = vrowzer.addFile('/data.bin', buffer)

    const webWorkerMessage = webWorkerFileMessages(worker).at(-1)!
    const serviceWorkerMessage = serviceWorkerFileMessages().at(-1)!
    expect(buffer.byteLength).toBe(3)
    expect(webWorkerMessage.content).not.toBe(buffer)
    expect(serviceWorkerMessage.content).not.toBe(buffer)
    expect(webWorkerMessage.content).not.toBe(serviceWorkerMessage.content)
    expect([...new Uint8Array(webWorkerMessage.content as ArrayBuffer)]).toEqual([1, 2, 3])
    expect([...new Uint8Array(serviceWorkerMessage.content as ArrayBuffer)]).toEqual([1, 2, 3])
    expect(worker.transfers.at(-1)?.[0]).toBe(webWorkerMessage.content)

    worker.ack(webWorkerMessage.id!)
    ackFromServiceWorker(webWorkerMessage.id!)
    await expect(adding).resolves.toBeUndefined()
  })

  test('rejects when the content cannot be sent and keeps nothing pending', async () => {
    vi.useFakeTimers()
    const { vrowzer } = await readyInstance()
    const detached = new ArrayBuffer(4)
    structuredClone(detached, { transfer: [detached] })

    const adding = vrowzer.addFile('/data.bin', detached)

    await expect(adding).rejects.toThrow('[Vrowzer] addFile("/data.bin") could not be sent:')
    await expect(adding).rejects.toMatchObject({ cause: expect.any(TypeError) })
    expect(vi.getTimerCount()).toBe(0)
    expect(serviceWorkerFileMessages()).toEqual([])
  })
})
