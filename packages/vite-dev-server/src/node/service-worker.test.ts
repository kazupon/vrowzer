import { createBirpc } from 'birpc'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import { getRpcTransferList } from '../shared/requestTransport'
import { deserializeRpcMessage, serializeRpcMessage } from '../shared/rpc'
import type { SerializedRequest, SerializedResponse, WorkerFunctions } from '../shared/rpc'

type Listener = (event: any) => void

interface FakeServer {
  fetchHandler: ((event: FetchEvent) => void) | null
  listeners: Map<string, Listener[]>
  listenOptions: unknown
  emit(type: string, event: unknown): void
}

const svcMocks = vi.hoisted(() => ({
  server: null as FakeServer | null,
}))

vi.mock('@vrowzer/service-worker-server', () => ({
  createSvcWorkerServer: () => {
    const listeners = new Map<string, Listener[]>()
    const server = {
      fetchHandler: null as ((event: FetchEvent) => void) | null,
      listeners,
      listenOptions: undefined as unknown,
      emit(type: string, event: unknown) {
        for (const listener of listeners.get(type) ?? []) {
          listener(event)
        }
      },
      setFetchHandler(handler: (event: FetchEvent) => void) {
        server.fetchHandler = handler
      },
      on(type: string, listener: Listener) {
        listeners.set(type, [...(listeners.get(type) ?? []), listener])
        return server
      },
      once(type: string, listener: Listener) {
        return server.on(type, listener)
      },
      off() {
        return server
      },
      listen(options: unknown) {
        server.listenOptions = options
        return server
      },
      close(cb?: (error?: Error) => void) {
        cb?.()
        return server
      },
    }
    svcMocks.server = server
    return server
  },
}))

import { createServer } from './service-worker'

const ORIGIN = 'https://vrowzer.test'

interface WindowClient {
  id: string
  postMessage: ReturnType<typeof vi.fn<(message: unknown) => void>>
}

interface FetchResult {
  /** `undefined` when the Service Worker left the request to the browser */
  response: Promise<Response> | undefined
}

let clients: WindowClient[]
let openPorts: MessagePort[]

function createScope(): ServiceWorkerGlobalScope {
  return {
    location: { href: `${ORIGIN}/service-worker.js` },
    clients: {
      get: async (id: string) => clients.find(client => client.id === id),
    },
  } as unknown as ServiceWorkerGlobalScope
}

function fakeServer(): FakeServer {
  if (!svcMocks.server) {
    throw new Error('createSvcWorkerServer() was not called')
  }
  return svcMocks.server
}

async function startServer(options: Parameters<typeof createServer>[1] = { basePath: '/__preview__/' }) {
  const listen = createServer(createScope(), options)
  return listen()
}

function dispatchFetch(path: string, init?: RequestInit): FetchResult {
  const result: FetchResult = { response: undefined }
  const event = {
    request: new Request(`${ORIGIN}${path}`, init),
    respondWith(response: Promise<Response>) {
      result.response = response
    },
  }
  fakeServer().fetchHandler!(event as unknown as FetchEvent)
  return result
}

function bytes(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer
}

function okResponse(body: string, headers: [string, string][] = []): SerializedResponse {
  return { status: 200, statusText: 'OK', headers, body: bytes(body) }
}

interface ConnectedWorker {
  port: MessagePort
  handleRequest: ReturnType<typeof vi.fn<(request: SerializedRequest) => Promise<SerializedResponse>>>
  hmrPorts: { clientId?: string, port: MessagePort }[]
}

/**
 * Connects a Web Worker as the runtime does: the client sends `V_WW_CONNECT_PORT` with one end of
 * a channel, and the Web Worker completes the handshake on the other end.
 */
async function connectWorker(
  clientId = 'host-1',
  handleRequest = vi.fn<(request: SerializedRequest) => Promise<SerializedResponse>>(
    async () => okResponse('answer'),
  ),
): Promise<ConnectedWorker> {
  const channel = new MessageChannel()
  openPorts.push(channel.port1, channel.port2)
  const worker: ConnectedWorker = { port: channel.port2, handleRequest, hmrPorts: [] }
  const connected = new Promise<void>((resolve) => {
    channel.port2.onmessage = (event) => {
      if (event.data?.type !== 'V_WW_SW_CHANNEL_READY' || event.data.source !== 'sw') {
        return
      }
      createBirpc<Record<string, never>, Pick<WorkerFunctions, 'handleRequest'>>({ handleRequest }, {
        post: data => channel.port2.postMessage(data, getRpcTransferList(data)),
        on: fn => {
          channel.port2.onmessage = (message) => {
            if (message.data?.type === 'V_WW_HMR_PORT') {
              worker.hmrPorts.push({ clientId: message.data.clientId, port: message.ports[0]! })
              return
            }
            fn(message.data)
          }
        },
        serialize: serializeRpcMessage,
        deserialize: deserializeRpcMessage,
      })
      resolve()
    }
  })
  fakeServer().emit('connection', {
    data: { type: 'V_WW_CONNECT_PORT' },
    ports: [channel.port1],
    clientId,
  })
  channel.port2.postMessage({ type: 'V_WW_SW_CHANNEL_READY', source: 'ww' })
  await connected
  return worker
}

async function isPending(promise: Promise<unknown>): Promise<boolean> {
  let settled = false
  promise.then(
    () => { settled = true },
    () => { settled = true },
  )
  for (let index = 0; index < 10; index++) {
    await Promise.resolve()
  }
  return !settled
}

beforeEach(() => {
  svcMocks.server = null
  clients = [{ id: 'host-1', postMessage: vi.fn<(message: unknown) => void>() }]
  openPorts = []
})

afterEach(() => {
  for (const port of openPorts) {
    port.close()
  }
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Service Worker request forwarding', () => {
  test('starts listening for fetch events and connections', async () => {
    await startServer()

    expect(fakeServer().fetchHandler).toEqual(expect.any(Function))
    expect(fakeServer().listenOptions).toMatchObject({ enableListenConnections: true })
  })

  test('forwards a request within the base path to the Web Worker and answers with its response', async () => {
    await startServer()
    const worker = await connectWorker()
    worker.handleRequest.mockResolvedValueOnce({
      status: 201,
      statusText: 'Created',
      headers: [['content-type', 'text/javascript'], ['etag', 'W/"1"']],
      body: bytes('export default 1'),
    })

    const { response } = dispatchFetch('/__preview__/src/main.ts?t=1', {
      headers: { accept: 'text/javascript' },
    })
    const answer = await response!

    expect(worker.handleRequest).toHaveBeenCalledExactlyOnceWith({
      url: `${ORIGIN}/__preview__/src/main.ts?t=1`,
      method: 'GET',
      headers: [['accept', 'text/javascript']],
      body: null,
    })
    expect(answer.status).toBe(201)
    expect(answer.statusText).toBe('Created')
    expect(answer.headers.get('content-type')).toBe('text/javascript')
    expect(answer.headers.get('etag')).toBe('W/"1"')
    expect(await answer.text()).toBe('export default 1')
  })

  test('adds the cross-origin isolation headers to the response', async () => {
    await startServer()
    await connectWorker()

    const answer = await dispatchFetch('/__preview__/').response!

    expect(answer.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin')
    expect(answer.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp')
    expect(answer.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin')
  })

  test('forwards the body of a request', async () => {
    await startServer()
    const worker = await connectWorker()

    await dispatchFetch('/__preview__/api', { method: 'POST', body: 'payload' }).response

    const [request] = worker.handleRequest.mock.calls[0]!
    expect(request.method).toBe('POST')
    expect(new TextDecoder().decode(request.body!)).toBe('payload')
  })

  test('answers a response without a body', async () => {
    await startServer()
    const worker = await connectWorker()
    worker.handleRequest.mockResolvedValueOnce({ status: 304, statusText: '', headers: [], body: null })

    const answer = await dispatchFetch('/__preview__/src/main.ts').response!

    expect(answer.status).toBe(304)
    expect(answer.body).toBeNull()
  })

  test('leaves a request outside the base path to the browser', async () => {
    await startServer()
    const worker = await connectWorker()

    expect(dispatchFetch('/index.html').response).toBeUndefined()
    expect(dispatchFetch('/__preview__other/main.js').response).toBeUndefined()
    expect(worker.handleRequest).not.toHaveBeenCalled()
  })

  test('answers with 500 when the Web Worker fails to answer', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await startServer()
    const worker = await connectWorker()
    worker.handleRequest.mockRejectedValueOnce(new Error('handler failed'))

    const answer = await dispatchFetch('/__preview__/src/main.ts').response!

    expect(answer.status).toBe(500)
    expect(await answer.text()).toContain('handler failed')
    expect(answer.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp')
  })

  test('tells the client that sent the port that the connection is established', async () => {
    await startServer()

    await connectWorker('host-1')

    await vi.waitFor(() => {
      expect(clients[0]!.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'V_WW_CONNECT_PORT_ACK' })
    })
  })

  test('forwards requests to the Web Worker that connected last', async () => {
    await startServer()
    const first = await connectWorker()
    const second = await connectWorker()

    await dispatchFetch('/__preview__/src/main.ts').response

    expect(first.handleRequest).not.toHaveBeenCalled()
    expect(second.handleRequest).toHaveBeenCalledOnce()
  })
})

describe('Service Worker without a Web Worker', () => {
  test('holds a request until a Web Worker connects', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await startServer({ basePath: '/__preview__/', ownerWaitTimeout: 1_000 })

    const { response } = dispatchFetch('/__preview__/src/main.ts')
    await vi.advanceTimersByTimeAsync(999)
    expect(await isPending(response!)).toBe(true)
    const worker = await connectWorker()

    const answer = await response!
    expect(answer.status).toBe(200)
    expect(await answer.text()).toBe('answer')
    expect(worker.handleRequest).toHaveBeenCalledOnce()
  })

  test('answers with 503 when no Web Worker connects in time', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await startServer({ basePath: '/__preview__/', ownerWaitTimeout: 1_000 })

    const { response } = dispatchFetch('/__preview__/src/main.ts')
    await vi.advanceTimersByTimeAsync(999)
    expect(await isPending(response!)).toBe(true)
    await vi.advanceTimersByTimeAsync(1)

    const answer = await response!
    expect(answer.status).toBe(503)
    expect(answer.headers.get('Content-Type')).toMatch(/^text\/plain/)
    expect(answer.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp')
    expect(await answer.text()).toContain('within 1000ms')
  })

  test('waits for 10 seconds by default', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await startServer()

    const { response } = dispatchFetch('/__preview__/src/main.ts')
    await vi.advanceTimersByTimeAsync(9_999)
    expect(await isPending(response!)).toBe(true)
    await vi.advanceTimersByTimeAsync(1)

    expect((await response!).status).toBe(503)
  })
})

describe('Service Worker HMR ports', () => {
  test('forwards the HMR port of a preview to the Web Worker', async () => {
    await startServer()
    const worker = await connectWorker()
    const hmrChannel = new MessageChannel()
    openPorts.push(hmrChannel.port1, hmrChannel.port2)

    fakeServer().emit('connection', {
      data: { type: 'vite:mc:init', clientId: 'preview-1' },
      ports: [hmrChannel.port1],
      clientId: 'preview-1',
    })

    await vi.waitFor(() => {
      expect(worker.hmrPorts).toHaveLength(1)
    })
    expect(worker.hmrPorts[0]!.clientId).toBe('preview-1')
  })

  test('forwards an HMR port once a Web Worker connects', async () => {
    await startServer()
    const hmrChannel = new MessageChannel()
    openPorts.push(hmrChannel.port1, hmrChannel.port2)

    fakeServer().emit('connection', {
      data: { type: 'vite:mc:init', clientId: 'preview-1' },
      ports: [hmrChannel.port1],
      clientId: 'preview-1',
    })
    const worker = await connectWorker()

    await vi.waitFor(() => {
      expect(worker.hmrPorts).toHaveLength(1)
    })
  })
})
