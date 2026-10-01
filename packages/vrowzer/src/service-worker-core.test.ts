import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'

type Listener = (event: any) => void

interface ServerOptions {
  beforeRequest: (request: Request) => Promise<Response | undefined>
  onWorkerChannelReady: () => void
}

const mocks = vi.hoisted(() => ({
  handleMessage: vi.fn<(message: unknown) => void>(),
  listen: vi.fn<() => Promise<void>>(),
  serverOptions: undefined as ServerOptions | undefined
}))

vi.mock('@vrowzer/fs', () => ({
  fs: {
    mkdirSync: vi.fn<() => void>(),
    writeFileSync: vi.fn<() => void>()
  },
  vol: {
    fromJSON: vi.fn<() => void>()
  }
}))
vi.mock('@vrowzer/fs/watcher', () => ({
  V_FS_ACK: 'V_FS_ACK',
  createFileSystemSubscriber: () => ({ watcher: {}, handleMessage: mocks.handleMessage })
}))
vi.mock('@vrowzer/vite-dev-server/dist/client/client.mjs?raw', () => ({ default: 'client code' }))
vi.mock('@vrowzer/vite-dev-server/dist/client/env.mjs?raw', () => ({ default: 'env code' }))
vi.mock('@vrowzer/vite-dev-server/service-worker', () => ({
  createServer: (_scope: unknown, _config: unknown, options: ServerOptions) => {
    mocks.serverOptions = options
    return mocks.listen
  }
}))

import { initServiceWorker } from './service-worker-core.ts'

type TestClient = ReturnType<typeof createClient>

let listeners: Map<string, Listener>
let windowClients: TestClient[]
let matchAllClients: ReturnType<typeof createMatchAll>

function createClient(id = 'client-1') {
  return { id, postMessage: vi.fn<(message: unknown) => void>() }
}

function receive(data: unknown, source: unknown): void {
  listeners.get('message')!({ data, source })
}

function createMatchAll() {
  return vi.fn<(options?: ClientQueryOptions) => Promise<TestClient[]>>(async () => windowClients)
}

function stubServiceWorkerScope(): void {
  listeners = new Map()
  matchAllClients = createMatchAll()
  vi.stubGlobal('self', {
    location: { href: 'https://vrowzer.test/service-worker.js' },
    addEventListener: (type: string, listener: Listener) => {
      listeners.set(type, listener)
    },
    clients: {
      get: async (id: string) => windowClients.find(client => client.id === id),
      matchAll: matchAllClients
    }
  })
}

function serverOptions(): ServerOptions {
  if (!mocks.serverOptions) {
    throw new Error('createServer() was not called')
  }
  return mocks.serverOptions
}

function previewRequest(): Request {
  return new Request('https://vrowzer.test/__preview__/main.js')
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
  for (let index = 0; index < 10; index++) {
    await Promise.resolve()
  }
  return !settled
}

function messagesOfType(client: TestClient, type: string): { type: string; instanceId?: string }[] {
  return client.postMessage.mock.calls
    .map(([message]) => message as { type: string; instanceId?: string })
    .filter(message => message.type === type)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.handleMessage.mockReset()
  mocks.serverOptions = undefined
  windowClients = []
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('initServiceWorker file synchronization', () => {
  beforeEach(async () => {
    // Keep the server starting, so that only message handling runs
    mocks.listen.mockReturnValue(new Promise<void>(() => {}))
    stubServiceWorkerScope()
    await initServiceWorker()
  })

  test.each([
    { type: 'V_FS_WRITE', id: 'op-1', path: '/main.ts', encoding: 'text', content: 'test' },
    { type: 'V_FS_UNLINK', id: 'op-1', path: '/main.ts' },
    { type: 'V_FS_INIT', id: 'op-1', files: { '/main.ts': 'test' } }
  ])('acknowledges $type to the sending client after applying it', message => {
    const client = createClient()
    mocks.handleMessage.mockImplementation(() => {
      expect(client.postMessage).not.toHaveBeenCalled()
    })

    receive(message, client)

    expect(mocks.handleMessage).toHaveBeenCalledExactlyOnceWith(message)
    expect(client.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'V_FS_ACK', id: 'op-1' })
  })

  test('acknowledges with the error when writing the file fails', () => {
    const client = createClient()
    mocks.handleMessage.mockImplementation(() => {
      throw new TypeError('invalid content')
    })

    receive({ type: 'V_FS_WRITE', id: 'op-2', path: '/main.ts', content: 'x' }, client)

    expect(client.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: 'V_FS_ACK',
      id: 'op-2',
      error: { name: 'TypeError', message: 'invalid content' }
    })
  })

  test('does not acknowledge messages without an id', () => {
    const client = createClient()

    receive({ type: 'V_FS_WRITE', path: '/main.ts', content: 'x' }, client)

    expect(mocks.handleMessage).toHaveBeenCalledOnce()
    expect(client.postMessage).not.toHaveBeenCalled()
  })
})

describe('initServiceWorker instance', () => {
  test('tells its window clients that it started once listen() completes', async () => {
    let completeListen!: () => void
    mocks.listen.mockReturnValue(
      new Promise<void>(resolve => {
        completeListen = resolve
      })
    )
    windowClients = [createClient('host-1'), createClient('host-2')]
    stubServiceWorkerScope()
    await initServiceWorker()
    await Promise.resolve()
    expect(matchAllClients).not.toHaveBeenCalled()

    completeListen()

    await vi.waitFor(() => {
      for (const client of windowClients) {
        expect(messagesOfType(client, 'V_SW_INSTANCE_STARTED')).toHaveLength(1)
      }
    })
    expect(matchAllClients).toHaveBeenCalledExactlyOnceWith({ type: 'window' })
    const [first] = messagesOfType(windowClients[0]!, 'V_SW_INSTANCE_STARTED')
    const [second] = messagesOfType(windowClients[1]!, 'V_SW_INSTANCE_STARTED')
    expect(first!.instanceId).toEqual(expect.any(String))
    expect(second!.instanceId).toBe(first!.instanceId)
  })

  test('answers the listen-ready ping and the activation with the same instance id', async () => {
    mocks.listen.mockResolvedValue()
    const client = createClient()
    windowClients = [client]
    stubServiceWorkerScope()
    await initServiceWorker()
    await vi.waitFor(() => {
      expect(messagesOfType(client, 'V_SW_INSTANCE_STARTED')).toHaveLength(1)
    })
    const [started] = messagesOfType(client, 'V_SW_INSTANCE_STARTED')

    receive({ type: 'V_SW_LISTEN_READY_PING' }, client)
    let activated!: Promise<unknown>
    listeners.get('activate')!({
      waitUntil: (promise: Promise<unknown>) => {
        activated = promise
      }
    })
    await activated

    await vi.waitFor(() => {
      expect(messagesOfType(client, 'V_SW_LISTEN_READY')).toEqual([
        { type: 'V_SW_LISTEN_READY', instanceId: started!.instanceId },
        { type: 'V_SW_LISTEN_READY', instanceId: started!.instanceId }
      ])
    })
  })

  test('creates a new instance id each time the script is evaluated', async () => {
    mocks.listen.mockResolvedValue()
    const client = createClient()
    windowClients = [client]

    for (let evaluation = 0; evaluation < 2; evaluation++) {
      stubServiceWorkerScope()
      await initServiceWorker()
      await vi.waitFor(() => {
        expect(messagesOfType(client, 'V_SW_INSTANCE_STARTED')).toHaveLength(evaluation + 1)
      })
    }

    const [first, second] = messagesOfType(client, 'V_SW_INSTANCE_STARTED')
    expect(second!.instanceId).not.toBe(first!.instanceId)
  })
})

describe('initServiceWorker project readiness', () => {
  beforeEach(async () => {
    mocks.listen.mockResolvedValue()
    stubServiceWorkerScope()
    await initServiceWorker()
  })

  test.each([
    { order: 'the files first', steps: ['files', 'channel'] },
    { order: 'the channel first', steps: ['channel', 'files'] }
  ])(
    'holds requests until it has the project files and the Web Worker channel ($order)',
    async ({ steps }) => {
      const response = serverOptions().beforeRequest(previewRequest())

      for (const step of steps) {
        expect(await isPending(response)).toBe(true)
        if (step === 'files') {
          receive({ type: 'V_FS_INIT', files: { '/main.js': 'code' } }, createClient())
        } else {
          serverOptions().onWorkerChannelReady()
        }
      }

      await expect(response).resolves.toBeUndefined()
    }
  )

  test('lets requests go on right away once the project is ready', async () => {
    receive({ type: 'V_FS_INIT', id: 'init-1', files: {} }, createClient())
    serverOptions().onWorkerChannelReady()

    expect(await isPending(serverOptions().beforeRequest(previewRequest()))).toBe(false)
    await expect(serverOptions().beforeRequest(previewRequest())).resolves.toBeUndefined()
  })

  test.each([
    { received: 'nothing', steps: [] },
    { received: 'only the files', steps: ['files'] },
    { received: 'only the channel', steps: ['channel'] }
  ])('answers with 503 after 10 seconds when it has received $received', async ({ steps }) => {
    vi.useFakeTimers()
    for (const step of steps) {
      if (step === 'files') {
        receive({ type: 'V_FS_INIT', files: {} }, createClient())
      } else {
        serverOptions().onWorkerChannelReady()
      }
    }

    const response = serverOptions().beforeRequest(previewRequest())
    await vi.advanceTimersByTimeAsync(9_999)
    expect(await isPending(response)).toBe(true)
    await vi.advanceTimersByTimeAsync(1)

    const answer = await response
    expect(answer?.status).toBe(503)
    expect(answer?.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(await answer?.text()).toContain('within 10000ms')
  })

  test('does not count project files that fail to apply', async () => {
    vi.useFakeTimers()
    const client = createClient()
    mocks.handleMessage.mockImplementation(() => {
      throw new Error('broken file')
    })
    receive({ type: 'V_FS_INIT', id: 'init-2', files: {} }, client)
    serverOptions().onWorkerChannelReady()

    const response = serverOptions().beforeRequest(previewRequest())
    await vi.advanceTimersByTimeAsync(10_000)

    expect(client.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: 'V_FS_ACK',
      id: 'init-2',
      error: { name: 'Error', message: 'broken file' }
    })
    expect((await response)?.status).toBe(503)
  })
})
