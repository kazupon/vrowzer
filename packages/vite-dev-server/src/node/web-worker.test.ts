import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import {
  V_SW_CONNECT_PORT,
  V_SW_CONNECT_PORT_ACK,
  V_WW_READY,
  V_WW_SETUP,
  V_WW_SETUP_ACK,
  V_WW_SETUP_ERROR,
} from '../shared/messages'

const transformerMocks = vi.hoisted(() => ({
  connectServiceWorkerPort: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  createDevHtmlTransformFn: vi.fn<() => () => void>(() => vi.fn<() => void>()),
  createRequestPipeline: vi.fn<(basePath?: string) => unknown>(() => ({
    middlewares: {},
    applyInternalMiddlewares: vi.fn<(...args: unknown[]) => void>(),
    handleRequest: vi.fn<(request: unknown) => Promise<unknown>>(),
  })),
  fs: {},
  isServerAccessDeniedForTransform: vi.fn<() => boolean>(() => false),
  setupHMR: vi.fn<() => Promise<{
    publicFiles: Set<string> | undefined
    waitForFileChange: (file: string) => Promise<void>
  }>>(
    async () => ({ publicFiles: undefined, waitForFileChange: async () => undefined }),
  ),
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

function dispatchSetup(
  workerScope: DedicatedWorkerGlobalScope,
  config: Record<string, unknown> = {},
  options: Record<string, unknown> = {},
): Promise<void> {
  return Promise.resolve(workerScope.onmessage?.({
    data: {
      type: V_WW_SETUP,
      config,
      options,
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

  test('rejects reserved config changes before starting the transformer', async () => {
    const workerScope = createWorkerScope()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const server = createServer(workerScope, {
      protectRuntimeConfig: true,
      inlineConfig: { base: '/host/' },
    })
    const failure = server.listen().catch(error => error as Error)
    await dispatchSetup(workerScope, { root: '/', base: '/preview/', publicDir: 'public' })
    expect(await failure).toMatchObject({ message: expect.stringContaining('runtime-owned base') })
    expect(transformerMocks.setupWorker).not.toHaveBeenCalled()
    expect(workerScope.postMessage).toHaveBeenCalledWith({
      type: V_WW_SETUP_ERROR,
      error: expect.objectContaining({ message: expect.stringContaining('runtime-owned base') }),
    })
    expect(vi.getTimerCount()).toBe(0)
  })

  test('forwards the protected defaults separately from user config and plugins', async () => {
    const workerScope = createWorkerScope()
    const plugin = { name: 'preview' }
    const runtime = {
      root: '/', base: '/preview/', publicDir: 'public',
      optimizeDeps: { disabled: true },
      experimental: { bundledDev: false },
    }
    const server = createServer(workerScope, {
      protectRuntimeConfig: true,
      plugins: [plugin],
      inlineConfig: { optimizeDeps: { exclude: ['local'] }, server: { forwardConsole: false } },
    })
    const listening = server.listen()
    await dispatchSetup(workerScope, runtime)
    await listening
    expect(transformerMocks.setupWorker).toHaveBeenCalledWith(
      expect.objectContaining({
        base: '/preview/',
        optimizeDeps: { disabled: true, exclude: ['local'] },
        server: { forwardConsole: false },
        plugins: [plugin],
      }),
      { runtimeConfig: expect.objectContaining({ base: '/preview/', optimizeDeps: { disabled: true } }) },
      {},
      undefined,
    )
    expect(runtime.optimizeDeps).toEqual({ disabled: true })
  })

  test('does not impose standard preview reservations on standalone server users', async () => {
    const workerScope = createWorkerScope()
    const server = createServer(workerScope, { inlineConfig: { root: '/custom', base: '/standalone/' } })
    const listening = server.listen()
    await dispatchSetup(workerScope, { root: '/', base: '/' })
    await listening
    expect(transformerMocks.setupWorker).toHaveBeenCalledWith(
      { root: '/custom', base: '/standalone/' }, {}, {}, undefined,
    )
  })
})

describe('Web Worker transform requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('leaves the server.fs check to the client environment', async () => {
    const setupResult = createSetupResult()
    transformerMocks.setupWorker.mockResolvedValue(setupResult)
    const workerScope = createWorkerScope()
    const server = createServer(workerScope)
    const listening = server.listen(0)

    await dispatchSetup(workerScope)
    const readyServer = await listening
    await readyServer.transformRequest('/secret.txt?raw', { ssr: false })

    expect(setupResult.environments.client.transformRequest)
      .toHaveBeenCalledExactlyOnceWith('/secret.txt?raw')
    expect(transformerMocks.isServerAccessDeniedForTransform).not.toHaveBeenCalled()
  })
})

describe('Web Worker request pipeline', () => {
  interface Pipeline {
    middlewares: object
    applyInternalMiddlewares: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>
    handleRequest: ReturnType<typeof vi.fn<(request: unknown) => Promise<unknown>>>
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function createdPipeline(): Pipeline {
    return transformerMocks.createRequestPipeline.mock.results[0]!.value as Pipeline
  }

  test('builds the Vite middlewares around the configureServer hooks', async () => {
    const setupResult = createSetupResult()
    const servers: unknown[] = []
    const postHook = vi.fn<() => void>()
    const hooks = [
      vi.fn<(server: unknown) => () => void>((server) => {
        servers.push(server)
        return postHook
      }),
      vi.fn<(server: unknown) => void>((server) => {
        servers.push(server)
      }),
    ]
    setupResult.config.getSortedPluginHooks = vi.fn<() => []>(() => hooks as unknown as [])
    transformerMocks.setupWorker.mockResolvedValue(setupResult)
    const publicFiles = new Set(['/hello.txt'])
    transformerMocks.setupHMR.mockResolvedValueOnce({
      publicFiles,
      waitForFileChange: async () => undefined,
    })
    const workerScope = createWorkerScope()
    const server = createServer(workerScope)
    const listening = server.listen(0)

    await dispatchSetup(workerScope, {}, { basePath: '/__preview__' })
    const readyServer = await listening

    expect(transformerMocks.createRequestPipeline).toHaveBeenCalledExactlyOnceWith('/__preview__')
    const pipeline = createdPipeline()
    // Plugins add their middlewares to the pipeline in configureServer
    expect(readyServer.middlewares).toBe(pipeline.middlewares)
    expect(servers).toEqual([readyServer, readyServer])
    // The functions that the hooks return come after the internal middlewares
    expect(pipeline.applyInternalMiddlewares)
      .toHaveBeenCalledExactlyOnceWith(readyServer, publicFiles, [postHook, undefined])
    const applied = pipeline.applyInternalMiddlewares.mock.invocationCallOrder[0]!
    expect(applied).toBeGreaterThan(hooks[1]!.mock.invocationCallOrder[0]!)
    expect(applied)
      .toBeLessThan(setupResult.environments.client.pluginContainer.buildStart.mock.invocationCallOrder[0]!)
    expect(postHook).not.toHaveBeenCalled()
  })

  test('answers the requests that the Service Worker forwards with the Vite middlewares', async () => {
    transformerMocks.setupWorker.mockResolvedValue(createSetupResult())
    const workerScope = createWorkerScope()
    const server = createServer(workerScope)
    const listening = server.listen(0)
    await dispatchSetup(workerScope)
    await listening
    const response = { status: 200, statusText: 'OK', headers: [], body: null }
    createdPipeline().handleRequest.mockResolvedValueOnce(response)
    transformerMocks.connectServiceWorkerPort.mockResolvedValueOnce({ $close: vi.fn<() => void>() })

    await Promise.resolve(workerScope.onmessage?.({
      data: { type: V_SW_CONNECT_PORT },
      ports: [{ close: vi.fn<() => void>() }],
    } as unknown as MessageEvent))
    const [, handlers] = transformerMocks.connectServiceWorkerPort.mock.calls[0]! as [
      unknown,
      { handleRequest: (request: unknown) => Promise<unknown> },
    ]
    const request = { url: 'https://example.com/__preview__/', method: 'GET', headers: [], body: null }

    await expect(handlers.handleRequest(request)).resolves.toBe(response)
    expect(createdPipeline().handleRequest).toHaveBeenCalledExactlyOnceWith(request)
  })
})

describe('Web Worker file changes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('waits for file changes with the tracker from setupHMR', async () => {
    const waitForFileChange = vi.fn<(file: string) => Promise<void>>(async () => undefined)
    transformerMocks.setupHMR.mockResolvedValueOnce({ publicFiles: undefined, waitForFileChange })
    transformerMocks.setupWorker.mockResolvedValue(createSetupResult())
    const workerScope = createWorkerScope()
    const server = createServer(workerScope)
    const listening = server.listen(0)

    await dispatchSetup(workerScope)
    const readyServer = await listening
    await readyServer.waitForFileChange('/src/main.ts')

    expect(waitForFileChange).toHaveBeenCalledExactlyOnceWith('/src/main.ts')
  })
})

describe('Web Worker Service Worker channel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function createPort() {
    return { close: vi.fn<() => void>() }
  }

  function createRpc() {
    return {
      $close: vi.fn<(error?: Error) => void>(),
    }
  }

  function dispatchConnectPort(
    workerScope: DedicatedWorkerGlobalScope,
    port: ReturnType<typeof createPort>,
  ): Promise<void> {
    return Promise.resolve(workerScope.onmessage?.({
      data: { type: V_SW_CONNECT_PORT },
      ports: [port],
    } as unknown as MessageEvent) as unknown as Promise<void>)
  }

  function connectPortAcks(workerScope: DedicatedWorkerGlobalScope): unknown[] {
    return vi.mocked(workerScope.postMessage).mock.calls
      .map(([message]) => message)
      .filter(message => (message as { type?: string }).type === V_SW_CONNECT_PORT_ACK)
  }

  async function readyWorkerScope(): Promise<DedicatedWorkerGlobalScope> {
    transformerMocks.setupWorker.mockResolvedValue(createSetupResult())
    const workerScope = createWorkerScope()
    const server = createServer(workerScope)
    const listening = server.listen(0)
    await dispatchSetup(workerScope)
    await listening
    return workerScope
  }

  test('closes the previous port and its RPC when a new port connects', async () => {
    const firstRpc = createRpc()
    const secondRpc = createRpc()
    transformerMocks.connectServiceWorkerPort
      .mockResolvedValueOnce(firstRpc)
      .mockResolvedValueOnce(secondRpc)
    const workerScope = await readyWorkerScope()
    const firstPort = createPort()
    const secondPort = createPort()

    await dispatchConnectPort(workerScope, firstPort)
    expect(firstPort.close).not.toHaveBeenCalled()
    await dispatchConnectPort(workerScope, secondPort)

    expect(firstPort.close).toHaveBeenCalledOnce()
    expect(firstRpc.$close).toHaveBeenCalledOnce()
    expect(secondPort.close).not.toHaveBeenCalled()
    expect(secondRpc.$close).not.toHaveBeenCalled()
    expect(connectPortAcks(workerScope)).toHaveLength(2)
  })

  test('does not acknowledge a port that a new port replaced during the handshake', async () => {
    let completeFirstHandshake!: (rpc: unknown) => void
    const firstRpc = createRpc()
    const secondRpc = createRpc()
    transformerMocks.connectServiceWorkerPort
      .mockReturnValueOnce(new Promise((resolve) => {
        completeFirstHandshake = resolve
      }))
      .mockResolvedValueOnce(secondRpc)
    const workerScope = await readyWorkerScope()
    const firstPort = createPort()
    const secondPort = createPort()

    const firstConnection = dispatchConnectPort(workerScope, firstPort)
    // Send the second port while the first one is in its handshake
    await vi.waitFor(() => {
      expect(transformerMocks.connectServiceWorkerPort).toHaveBeenCalledOnce()
    })
    await dispatchConnectPort(workerScope, secondPort)
    completeFirstHandshake(firstRpc)
    await firstConnection

    expect(firstPort.close).toHaveBeenCalledOnce()
    expect(firstRpc.$close).toHaveBeenCalledOnce()
    expect(secondRpc.$close).not.toHaveBeenCalled()
    expect(connectPortAcks(workerScope)).toHaveLength(1)
  })
})
