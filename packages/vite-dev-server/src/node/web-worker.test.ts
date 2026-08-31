import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import {
  V_WW_READY,
  V_WW_SETUP,
  V_WW_SETUP_ACK,
  V_WW_SETUP_ERROR,
} from '../shared/messages'

const transformerMocks = vi.hoisted(() => ({
  connectServiceWorkerPort: vi.fn<() => Promise<void>>(),
  createDevHtmlTransformFn: vi.fn<() => () => void>(() => vi.fn<() => void>()),
  fs: {},
  isServerAccessDeniedForTransform: vi.fn<() => boolean>(() => false),
  setupHMR: vi.fn<() => Promise<void>>(async () => undefined),
  setupWorker: vi.fn<() => Promise<unknown>>(),
}))

vi.mock('./transformer', () => transformerMocks)

import { createServer } from './web-worker'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function createSetupResult() {
  return {
    config: {
      getSortedPluginHooks: vi.fn<() => []>(() => []),
    },
    environments: {
      client: {
        pluginContainer: {
          buildStart: vi.fn<() => Promise<void>>(async () => undefined),
          minimalContext: {},
        },
        transformRequest: vi.fn<() => void>(),
        warmupRequest: vi.fn<() => void>(),
      },
    },
    moduleGraph: {},
    watcher: {},
    ws: {},
  }
}

function createWorkerScope() {
  return {
    onmessage: null,
    postMessage: vi.fn<(message: unknown) => void>(),
  } as unknown as DedicatedWorkerGlobalScope
}

function dispatchSetup(workerScope: DedicatedWorkerGlobalScope): Promise<void> {
  return Promise.resolve(workerScope.onmessage?.({
    data: {
      type: V_WW_SETUP,
      config: {},
      options: {},
      files: {},
    },
  } as MessageEvent) as unknown as Promise<void>)
}

describe('Web Worker server listen timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    transformerMocks.setupWorker.mockResolvedValue(createSetupResult())
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('sends V_WW_READY before listen starts', () => {
    const workerScope = createWorkerScope()

    createServer(workerScope)

    expect(workerScope.postMessage).toHaveBeenCalledWith({ type: V_WW_READY })
  })

  test('rejects after the default timeout when setup does not arrive', async () => {
    const server = createServer(createWorkerScope())
    const listening = server.listen()

    const rejection = listening.catch(error => error as Error)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(await rejection).toMatchObject({
      message: 'listen() timed out after 30000ms waiting for V_WW_SETUP',
    })
  })

  test('rejects after a custom timeout when setup does not arrive', async () => {
    const server = createServer(createWorkerScope())
    const listening = server.listen(125)

    const rejection = listening.catch(error => error as Error)
    await vi.advanceTimersByTimeAsync(125)
    expect(await rejection).toMatchObject({
      message: 'listen() timed out after 125ms waiting for V_WW_SETUP',
    })
  })

  test('does not time out heavy setup after the setup message arrives', async () => {
    const workerScope = createWorkerScope()
    const setup = deferred<ReturnType<typeof createSetupResult>>()
    transformerMocks.setupWorker.mockReturnValueOnce(setup.promise)
    const server = createServer(workerScope)
    const listening = server.listen(100)
    let settled = false
    void listening.then(
      () => { settled = true },
      () => { settled = true },
    )

    const handling = dispatchSetup(workerScope)
    await vi.advanceTimersByTimeAsync(101)

    expect(settled).toBe(false)
    setup.resolve(createSetupResult())
    await handling
    await expect(listening).resolves.toEqual(
      expect.objectContaining({ config: expect.any(Object) }),
    )
    expect(workerScope.postMessage).toHaveBeenCalledWith({ type: V_WW_SETUP_ACK })
  })

  test('disables the setup-message timeout when timeout is zero', async () => {
    const workerScope = createWorkerScope()
    const setup = deferred<ReturnType<typeof createSetupResult>>()
    transformerMocks.setupWorker.mockReturnValueOnce(setup.promise)
    const server = createServer(workerScope)
    const listening = server.listen(0)

    expect(vi.getTimerCount()).toBe(0)

    const handling = dispatchSetup(workerScope)
    await vi.advanceTimersByTimeAsync(60_000)
    setup.resolve(createSetupResult())
    await handling
    await expect(listening).resolves.toEqual(
      expect.objectContaining({ config: expect.any(Object) }),
    )
  })

  test('reports setup errors and rejects immediately', async () => {
    const workerScope = createWorkerScope()
    const failure = new Error('transformer setup failed')
    transformerMocks.setupWorker.mockRejectedValueOnce(failure)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const server = createServer(workerScope)
    const listening = server.listen()

    const rejection = listening.catch(error => error as Error)
    await dispatchSetup(workerScope)
    expect(await rejection).toBe(failure)

    expect(workerScope.postMessage).toHaveBeenCalledWith({
      type: V_WW_SETUP_ERROR,
      error: expect.objectContaining({ message: failure.message }),
    })
    expect(vi.getTimerCount()).toBe(0)
  })

  test('preserves setup errors when listen starts after setup', async () => {
    const workerScope = createWorkerScope()
    const failure = new Error('early transformer setup failed')
    transformerMocks.setupWorker.mockRejectedValueOnce(failure)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const server = createServer(workerScope)

    await dispatchSetup(workerScope)

    await expect(server.listen()).rejects.toBe(failure)
    expect(vi.getTimerCount()).toBe(0)
  })
})
