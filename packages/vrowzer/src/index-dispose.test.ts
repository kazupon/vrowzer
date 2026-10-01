import {
  V_SW_CONNECT_PORT,
  V_SW_CONNECT_PORT_ACK,
  V_WW_CONNECT_PORT_ACK,
  V_WW_READY,
  V_WW_SETUP,
  V_WW_SETUP_ACK
} from '@vrowzer/vite-dev-server/messages'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'

// The mock factories run while ./index.ts is imported, so they read the fakes from this
// hoisted state at call time instead of referring to the classes below.
const runtime = vi.hoisted(() => ({
  controller: null as unknown,
  serviceWorker: null as unknown,
  publisher: null as unknown,
  initServiceWorker: null as unknown as (options: { signal?: AbortSignal }) => Promise<unknown>
}))

vi.mock('./controller.ts', () => ({
  getController: () => runtime.controller,
  getServiceWorker: () => runtime.serviceWorker,
  initServiceWorker: (options: { signal?: AbortSignal }) => runtime.initServiceWorker(options)
}))
vi.mock('@vrowzer/fs/watcher', () => ({
  V_FS_ACK: 'V_FS_ACK',
  createFileSystemPublisher: () => runtime.publisher
}))
vi.mock('@vrowzer/vite-dev-server/dist/client/client.mjs?raw', () => ({ default: '' }))
vi.mock('@vrowzer/vite-dev-server/dist/client/env.mjs?raw', () => ({ default: '' }))

import { Vrowzer } from './index.ts'

type MessageListener = (event: MessageEvent) => void

class FakeContainer {
  readonly listeners = new Set<MessageListener>()

  addEventListener(_type: string, listener: MessageListener): void {
    this.listeners.add(listener)
  }

  removeEventListener(_type: string, listener: MessageListener): void {
    this.listeners.delete(listener)
  }

  dispatch(data: unknown): void {
    for (const listener of this.listeners) {
      listener({ data } as MessageEvent)
    }
  }
}

class FakeController {
  readonly container = new FakeContainer()
  readonly handlers = new Map<string, Set<(...args: unknown[]) => void>>()

  get subscriptionCount(): number {
    let count = 0
    for (const handlers of this.handlers.values()) {
      count += handlers.size
    }
    return count
  }

  on(event: string, handler: (...args: unknown[]) => void): () => void {
    const handlers = this.handlers.get(event) ?? new Set()
    this.handlers.set(event, handlers)
    handlers.add(handler)
    return () => {
      handlers.delete(handler)
    }
  }

  emit(event: string, ...args: unknown[]): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args)
    }
  }
}

class FakePublisher {
  readonly targets = new Set<unknown>()
  readonly writeFile =
    vi.fn<(path: string, content: string | ArrayBuffer, options?: { id?: string }) => void>()
  readonly unlink = vi.fn<(path: string, options?: { id?: string }) => void>()

  addTarget(target: unknown): void {
    this.targets.add(target)
  }

  removeTarget(target: unknown): void {
    this.targets.delete(target)
  }
}

class FakeWorker {
  static instances: FakeWorker[] = []
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessage: MessageListener | null = null
  readonly messages: unknown[] = []
  readonly terminate = vi.fn<() => void>()

  constructor() {
    FakeWorker.instances.push(this)
  }

  postMessage(message: unknown): void {
    this.messages.push(message)
  }

  send(type: string): void {
    this.onmessage?.({ data: { type } } as MessageEvent)
  }

  hasReceived(type: string): boolean {
    return this.messages.some(
      message =>
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === type
    )
  }
}

class TestContainer {
  readonly children: TestIframe[] = []

  appendChild(iframe: TestIframe): TestIframe {
    iframe.parent = this
    this.children.push(iframe)
    return iframe
  }
}

class TestIframe {
  readonly style = { cssText: '' }
  parent: TestContainer | null = null
  contentWindow: object | null = {}
  srcdoc = ''

  setAttribute(): void {}

  remove(): void {
    if (!this.parent) {
      return
    }
    this.parent.children.splice(this.parent.children.indexOf(this), 1)
    this.parent = null
    this.contentWindow = null
  }
}

class TestWindow {
  readonly location = { origin: 'https://host.test' }
  readonly messageListeners = new Set<MessageListener>()

  addEventListener(_type: string, listener: MessageListener): void {
    this.messageListeners.add(listener)
  }

  removeEventListener(_type: string, listener: MessageListener): void {
    this.messageListeners.delete(listener)
  }
}

let controller: FakeController
let serviceWorker: { postMessage: ReturnType<typeof vi.fn<(message: unknown) => void>> }
let publisher: FakePublisher
let testWindow: TestWindow
let initServiceWorker: ReturnType<
  typeof vi.fn<(options: { signal?: AbortSignal }) => Promise<unknown>>
>

function createContainer(): TestContainer {
  return new TestContainer()
}

function lastWorker(): FakeWorker {
  const worker = FakeWorker.instances.at(-1)
  if (!worker) {
    throw new Error('No Web Worker was created')
  }
  return worker
}

async function completeWebWorkerSetup(worker: FakeWorker): Promise<void> {
  worker.send(V_WW_READY)
  await vi.waitFor(() => {
    expect(worker.hasReceived(V_WW_SETUP)).toBe(true)
  })
  worker.send(V_WW_SETUP_ACK)
}

async function waitForChannelHandshake(worker: FakeWorker): Promise<void> {
  await vi.waitFor(() => {
    expect(worker.hasReceived(V_SW_CONNECT_PORT)).toBe(true)
  })
}

async function readyFully(vrowzer: ReturnType<typeof Vrowzer>): Promise<FakeWorker> {
  const ready = vrowzer.ready({ files: {} })
  const worker = lastWorker()
  await completeWebWorkerSetup(worker)
  await waitForChannelHandshake(worker)
  worker.send(V_SW_CONNECT_PORT_ACK)
  controller.container.dispatch({ type: V_WW_CONNECT_PORT_ACK })
  await expect(ready).resolves.toBe(true)
  return worker
}

beforeEach(() => {
  vi.useFakeTimers()
  FakeWorker.instances = []
  controller = new FakeController()
  serviceWorker = { postMessage: vi.fn<(message: unknown) => void>() }
  publisher = new FakePublisher()
  testWindow = new TestWindow()
  initServiceWorker = vi.fn<(options: { signal?: AbortSignal }) => Promise<unknown>>(
    async () => controller
  )
  runtime.controller = controller
  runtime.serviceWorker = serviceWorker
  runtime.publisher = publisher
  runtime.initServiceWorker = initServiceWorker
  vi.stubGlobal('Worker', FakeWorker)
  vi.stubGlobal('document', { createElement: () => new TestIframe() })
  vi.stubGlobal('window', testWindow)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Vrowzer dispose', () => {
  test('returns the same promise and blocks new work before ready()', async () => {
    const vrowzer = Vrowzer()
    const progress = vi.fn<(phase: string) => void>()
    vrowzer.on('progress', progress)

    const disposing = vrowzer.dispose()
    vrowzer.emit('progress', 'after dispose')

    expect(progress).not.toHaveBeenCalled()
    expect(vrowzer.dispose()).toBe(disposing)
    expect(vrowzer[Symbol.asyncDispose]()).toBe(disposing)
    expect(Symbol.dispose in vrowzer).toBe(false)
    await expect(disposing).resolves.toBeUndefined()

    await expect(vrowzer.ready({ files: {} })).rejects.toThrow(
      'ready() cannot be called after dispose()'
    )
    expect(() => vrowzer.mount(createContainer() as unknown as HTMLElement, { id: 'x' })).toThrow(
      'mount() cannot be called after dispose()'
    )
    await expect(vrowzer.addFile('/a.js', '')).rejects.toThrow(
      'addFile() cannot be called after dispose()'
    )
    await expect(vrowzer.updateFile('/a.js', '')).rejects.toThrow(
      'updateFile() cannot be called after dispose()'
    )
    await expect(vrowzer.deleteFile('/a.js')).rejects.toThrow(
      'deleteFile() cannot be called after dispose()'
    )
    expect(publisher.writeFile).not.toHaveBeenCalled()
    expect(publisher.unlink).not.toHaveBeenCalled()
    expect(vrowzer.sessions()).toEqual([])
    expect(vrowzer.getSession('x')).toBeUndefined()
    expect(() => {
      vrowzer.unmount()
      vrowzer.reloadPreview()
    }).not.toThrow()
    expect(FakeWorker.instances).toHaveLength(0)
  })

  test('aborts ready() while the Web Worker is being set up', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const vrowzer = Vrowzer()
    const ready = vrowzer.ready({ files: {} })
    const worker = lastWorker()

    await vrowzer.dispose()

    await expect(ready).resolves.toBe(false)
    expect(worker.terminate).toHaveBeenCalledTimes(1)
    expect(publisher.targets.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(consoleError).not.toHaveBeenCalled()

    // A late message from the Worker changes nothing
    worker.send(V_WW_READY)
    await vi.advanceTimersByTimeAsync(0)
    expect(worker.hasReceived(V_WW_SETUP)).toBe(false)
  })

  test('aborts ready() while the Service Worker is starting', async () => {
    let resolveInitialization: (value: unknown) => void = () => {}
    initServiceWorker.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveInitialization = resolve
        })
    )
    const vrowzer = Vrowzer()
    const ready = vrowzer.ready({ files: {} })
    const worker = lastWorker()
    await completeWebWorkerSetup(worker)

    await vrowzer.dispose()

    await expect(ready).resolves.toBe(false)
    const [options] = initServiceWorker.mock.calls[0]!
    expect(options.signal?.aborted).toBe(true)
    expect(worker.terminate).toHaveBeenCalledTimes(1)

    // A late initialization changes nothing
    resolveInitialization(controller)
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.subscriptionCount).toBe(0)
    expect(publisher.targets.size).toBe(0)
    expect(serviceWorker.postMessage).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  test('aborts ready() during the channel handshake', async () => {
    const vrowzer = Vrowzer()
    const ready = vrowzer.ready({ files: {} })
    const worker = lastWorker()
    await completeWebWorkerSetup(worker)
    await waitForChannelHandshake(worker)
    expect(controller.subscriptionCount).toBe(6)
    expect(publisher.targets.size).toBe(2)
    expect(controller.container.listeners.size).toBe(1)

    await vrowzer.dispose()

    await expect(ready).resolves.toBe(false)
    expect(controller.container.listeners.size).toBe(0)
    expect(controller.subscriptionCount).toBe(0)
    expect(publisher.targets.size).toBe(0)
    expect(worker.terminate).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  test('releases everything after a successful ready()', async () => {
    const vrowzer = Vrowzer()
    const progress = vi.fn<(phase: string) => void>()
    vrowzer.on('progress', progress)
    const worker = await readyFully(vrowzer)
    const container = createContainer()
    vrowzer.mount(container as unknown as HTMLElement, { id: 'desktop' })
    expect(testWindow.messageListeners.size).toBe(1)

    await vrowzer.dispose()

    expect(worker.terminate).toHaveBeenCalledTimes(1)
    expect(publisher.targets.size).toBe(0)
    expect(controller.subscriptionCount).toBe(0)
    expect(container.children).toHaveLength(0)
    expect(testWindow.messageListeners.size).toBe(0)
    expect(vrowzer.sessions()).toEqual([])
    controller.emit('progress', 'late')
    expect(progress).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  test('rejects the file operations that wait for the Workers', async () => {
    const vrowzer = Vrowzer()
    const worker = await readyFully(vrowzer)
    expect(controller.container.listeners.size).toBe(1)

    const updating = vrowzer.updateFile('/a.js', 'updated')
    const deleting = vrowzer.deleteFile('/b.js')
    const rejections = Promise.allSettled([updating, deleting])
    expect(vi.getTimerCount()).toBe(2)

    await vrowzer.dispose()

    expect(await rejections).toEqual([
      {
        status: 'rejected',
        reason: expect.objectContaining({
          message: '[Vrowzer] updateFile("/a.js") was cancelled by dispose()'
        })
      },
      {
        status: 'rejected',
        reason: expect.objectContaining({
          message: '[Vrowzer] deleteFile("/b.js") was cancelled by dispose()'
        })
      }
    ])
    expect(controller.container.listeners.size).toBe(0)
    expect(worker.onmessage).toBeNull()
    expect(worker.onerror).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  test('releases what a failed ready() created', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const vrowzer = Vrowzer()
    const ready = vrowzer.ready({ files: {} })
    const worker = lastWorker()
    await completeWebWorkerSetup(worker)
    await waitForChannelHandshake(worker)

    // The handshake times out
    await vi.advanceTimersByTimeAsync(15_000)

    await expect(ready).resolves.toBe(false)
    expect(consoleError).toHaveBeenCalledWith('[Vrowzer] ready() failed:', expect.any(Error))
    expect(controller.subscriptionCount).toBe(0)
    expect(publisher.targets.size).toBe(0)
    expect(controller.container.listeners.size).toBe(0)
    expect(worker.terminate).toHaveBeenCalledTimes(1)
    await expect(vrowzer.dispose()).resolves.toBeUndefined()
  })

  test('keeps releasing when a step fails and rejects with the failures', async () => {
    const vrowzer = Vrowzer()
    const progress = vi.fn<(phase: string) => void>()
    vrowzer.on('progress', progress)
    const worker = await readyFully(vrowzer)
    const container = createContainer()
    vrowzer.mount(container as unknown as HTMLElement, { id: 'desktop' })
    const failure = new Error('terminate failed')
    worker.terminate.mockImplementation(() => {
      throw failure
    })

    const disposing = vrowzer.dispose()

    await expect(disposing).rejects.toThrow(AggregateError)
    await expect(disposing).rejects.toMatchObject({ errors: [failure] })
    expect(vrowzer.dispose()).toBe(disposing)
    expect(container.children).toHaveLength(0)
    expect(controller.subscriptionCount).toBe(0)
    expect(publisher.targets.size).toBe(0)
    vrowzer.emit('progress', 'late')
    expect(progress).not.toHaveBeenCalled()
  })

  test('does not accumulate Workers, listeners or timers across instances', async () => {
    for (let index = 0; index < 3; index++) {
      const vrowzer = Vrowzer()
      await readyFully(vrowzer)
      vrowzer.mount(createContainer() as unknown as HTMLElement, { id: `preview-${index}` })
      await vrowzer.dispose()
    }

    expect(FakeWorker.instances).toHaveLength(3)
    for (const worker of FakeWorker.instances) {
      expect(worker.terminate).toHaveBeenCalledTimes(1)
    }
    expect(controller.subscriptionCount).toBe(0)
    expect(controller.container.listeners.size).toBe(0)
    expect(publisher.targets.size).toBe(0)
    expect(testWindow.messageListeners.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})
