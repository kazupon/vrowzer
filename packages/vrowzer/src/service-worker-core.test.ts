import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'

type Listener = (event: any) => void

interface ServerOptions {
  version?: string
  basePath?: string
  ownerWaitTimeout?: number
}

const mocks = vi.hoisted(() => ({
  listen: vi.fn<() => Promise<void>>(),
  serverOptions: undefined as ServerOptions | undefined
}))

vi.mock('@vrowzer/vite-dev-server/service-worker', () => ({
  createServer: (_scope: unknown, options: ServerOptions) => {
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

function messagesOfType(client: TestClient, type: string): { type: string; instanceId?: string }[] {
  return client.postMessage.mock.calls
    .map(([message]) => message as { type: string; instanceId?: string })
    .filter(message => message.type === type)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.serverOptions = undefined
  windowClients = []
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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

describe('initServiceWorker server', () => {
  test('forwards the requests within the preview base path to the Web Workers', async () => {
    mocks.listen.mockResolvedValue()
    stubServiceWorkerScope()

    await initServiceWorker()

    // A request waits for a Web Worker as long as the runtime waits for its recovery
    expect(serverOptions()).toEqual({
      version: expect.any(String),
      basePath: '/__preview__/',
      ownerWaitTimeout: 10_000
    })
  })

  test('does not take the project files, which only the Web Worker has', async () => {
    mocks.listen.mockResolvedValue()
    stubServiceWorkerScope()
    await initServiceWorker()
    const client = createClient()

    receive({ type: 'V_FS_WRITE', id: 'op-1', path: '/main.ts', content: 'x' }, client)
    receive({ type: 'V_FS_INIT', id: 'op-2', files: { '/main.ts': 'x' } }, client)

    expect(client.postMessage).not.toHaveBeenCalled()
  })
})
