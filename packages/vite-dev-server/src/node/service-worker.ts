/**
 * Service Worker entry point for @vrowzer/vite-dev-server
 *
 * The Service Worker forwards each request within the base path to the Web Worker, which has the
 * project files, the module graph and the plugins, and answers the request with the Vite
 * middlewares. It also forwards the HMR ports of the previews to the Web Worker.
 *
 * The Service Worker does not resolve the Vite config, and has neither plugins nor files.
 *
 * @module node/service-worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { createSvcWorkerServer } from '@vrowzer/service-worker-server'
import { createBirpc } from 'birpc'
import { Hono } from 'hono'
import { handle } from 'hono/service-worker'
import { getRpcTransferList, serializeRequest } from '../shared/requestTransport'
import { deserializeRpcMessage, serializeRpcMessage } from '../shared/rpc'
import { shouldHandleViteFetch } from '../shared/serviceWorkerFetch'
import { crossOriginMiddleware } from './server/middlewares/crossOrigin'
import { timeMiddleware } from './server/middlewares/time'
import { createDebugger } from './utils'

const debug = createDebugger('vrowzer:service-worker')

import type { ConnectionEvent, SvcWorkerServer } from '@vrowzer/service-worker-server'
import type { BirpcReturn } from 'birpc'
import type { BlankSchema } from 'hono/types'
import type { StatusCode } from 'hono/utils/http-status'
import type {
  ConnectWebWorkerPortMessage,
  ViteMessageChannelInitMessage,
  WebWorkerServiceWorkerChannelReadyMessage,
} from '../shared/messages'
import type { ServiceWorkerFunctions, WorkerFunctions } from '../shared/rpc'
import type { ViteEnv } from './server/index'

/**
 * The server that receives the fetch events and the MessageChannel connections of the Service Worker.
 */
export type HttpServer = SvcWorkerServer<
  ConnectWebWorkerPortMessage | ViteMessageChannelInitMessage
>

/**
 * Options for {@link createServer} function.
 */
export interface CreateServerOptions {
  /**
   * Version string for the service worker.
   */
  version?: string
  /**
   * Base path for the Vite Dev Server routes.
   * The Service Worker forwards the requests within it to the Web Worker.
   *
   * @example '/__preview__' - Server handles /__preview__/* requests
   * @default '/'
   */
  basePath?: string
  /**
   * How long a request waits for a Web Worker to connect, in milliseconds. A request that no Web
   * Worker can answer by then gets a `503` response.
   *
   * A restarted Service Worker has no Web Worker channel until the runtime connects one again, so
   * the requests made in the meantime wait for it.
   *
   * @default 10_000
   */
  ownerWaitTimeout?: number
}

/**
 * The Service Worker side of the dev server, which forwards the requests to the Web Worker.
 */
export interface ServiceWorkerServer {
  /**
   * The server that receives the fetch events and the MessageChannel connections.
   */
  readonly httpServer: HttpServer
  /**
   * Stop answering requests.
   */
  close(): Promise<void>
}

/**
 * A channel with a Web Worker, after the handshake.
 */
interface WorkerChannel {
  port: MessagePort
  rpc: BirpcReturn<WorkerFunctions, ServiceWorkerFunctions>
}

const DEFAULT_OWNER_WAIT_TIMEOUT = 10_000

/**
 * Create the Service Worker side of the dev server.
 *
 * The fetch event handler is registered synchronously, as Service Workers require. The returned
 * `listen()` starts answering requests and accepting the Web Worker channels.
 *
 * @param serviceWorkerScope - The Service Worker's global scope (`self`)
 * @param options - Server options
 * @returns A function that starts the server
 */
export function createServer(
  serviceWorkerScope: ServiceWorkerGlobalScope,
  options: CreateServerOptions = {},
): () => Promise<ServiceWorkerServer> {
  const basePath = options.basePath || '/'
  const ownerWaitTimeout = options.ownerWaitTimeout ?? DEFAULT_OWNER_WAIT_TIMEOUT
  const workerOrigin = new URL(serviceWorkerScope.location.href).origin

  // The channel with the Web Worker that answers the requests. A later connection replaces it.
  let workerChannel: WorkerChannel | null = null
  // Requests and HMR ports waiting for a Web Worker to connect
  const workerWaiters = new Set<(channel: WorkerChannel) => void>()

  /**
   * Wait for a Web Worker to connect, for `ownerWaitTimeout` at most.
   *
   * @returns The channel, or `null` when no Web Worker connected in time
   */
  function waitForWorker(): Promise<WorkerChannel | null> {
    if (workerChannel) {
      return Promise.resolve(workerChannel)
    }
    return new Promise((resolve) => {
      const onConnect = (channel: WorkerChannel) => {
        clearTimeout(timer)
        resolve(channel)
      }
      const timer = setTimeout(() => {
        workerWaiters.delete(onConnect)
        resolve(null)
      }, ownerWaitTimeout)
      workerWaiters.add(onConnect)
    })
  }

  function connectWorker(channel: WorkerChannel): void {
    workerChannel = channel
    const waiters = [...workerWaiters]
    workerWaiters.clear()
    for (const waiter of waiters) {
      waiter(channel)
    }
  }

  let middlewares = new Hono<ViteEnv, BlankSchema, '/'>()
  // NOTE(kazupon): Apply the base path before `handle()`. `basePath()` returns a clone with its own
  // error handler, so `onError()` must be registered on the same app that handles requests.
  if (basePath !== '/') {
    middlewares = middlewares.basePath(basePath)
  }

  // request timer
  if (import.meta.env.DEBUG) {
    middlewares.use(timeMiddleware('/'))
  }

  // Cross-origin isolation headers (CORP/COEP/COOP) for credentialless iframe + SW
  middlewares.use(crossOriginMiddleware())

  // The Web Worker answers the request with the Vite middlewares
  middlewares.use(async (c) => {
    const channel = await waitForWorker()
    if (!channel) {
      return c.text(
        `[@vrowzer/vite-dev-server] The preview is not ready: no Web Worker connected within ${ownerWaitTimeout}ms.`,
        503,
      )
    }
    const response = await channel.rpc.handleRequest(await serializeRequest(c.req.raw))
    // `newResponse()` adds the headers that the earlier middlewares set, but drops the status text
    const answered = c.newResponse(response.body, {
      status: response.status as StatusCode,
      headers: new Headers(response.headers),
    })
    return new Response(answered.body, {
      status: answered.status,
      statusText: response.statusText,
      headers: answered.headers,
    })
  })

  // The Web Worker answers the errors of the project with Vite's error page. An error here means
  // that the request could not reach the Web Worker, or its response could not come back.
  middlewares.onError((error, c) => {
    console.error('[@vrowzer/vite-dev-server] The Web Worker did not answer a request:', error)
    return c.text(`[@vrowzer/vite-dev-server] Internal Server Error: ${error.message}`, 500)
  })

  const httpServer: HttpServer = createSvcWorkerServer<ConnectWebWorkerPortMessage | ViteMessageChannelInitMessage>(serviceWorkerScope, {
    version: options.version ?? '0.0.0',
    claimOnActivate: true,
    debug: createDebugger('vrowzer:svc-worker-server')!,
  })
  // NOTE(kazupon): Without options, Hono's Service Worker adapter fetches a 404 response again
  // from the network, so requests for missing preview files reached the host server. Requests
  // within the base path belong to the virtual project, so answer them with the 404, as Vite does.
  const honoFetchHandler = handle(middlewares, {})
  const fetchHandler = (event: FetchEvent) => {
    // Leave requests outside the virtual project unanswered so the browser
    // performs the fetch with the controlled client's native semantics.
    if (!shouldHandleViteFetch(event.request.url, workerOrigin, basePath)) {
      return
    }
    honoFetchHandler(event)
  }

  // Register fetch handler immediately (synchronously)
  // This is critical for Service Workers which require fetch listeners during script evaluation
  httpServer.setFetchHandler(fetchHandler)

  // Listen for connections from Main Thread.
  // Handles two types:
  // 1. V_WW_CONNECT_PORT: MessagePort for Web Worker birpc communication
  // 2. vite:mc:init: iframe HMR port, forwarded to WW via the birpc port
  function onConnection(event: ConnectionEvent<ConnectWebWorkerPortMessage | ViteMessageChannelInitMessage>): void {
    // V_WW_CONNECT_PORT: birpc handshake with Web Worker
    if (event.data.type === 'V_WW_CONNECT_PORT' && event.ports[0]) {
      const port = event.ports[0]
      const clientId = event.clientId
      debug?.('Worker port received via connection event')

      // Phase 1: Handshake — wait for WW's channel-ready before creating birpc
      port.onmessage = async (e: MessageEvent<WebWorkerServiceWorkerChannelReadyMessage>) => {
        if (e.data.type === 'V_WW_SW_CHANNEL_READY' && e.data.source === 'ww') {
          // Reply with SW's channel-ready
          port.postMessage({ type: 'V_WW_SW_CHANNEL_READY', source: 'sw' })

          const rpc = createBirpc<WorkerFunctions, ServiceWorkerFunctions>(
            {},
            {
              // Transfer the request bodies of handleRequest instead of copying them
              post: rpcData => port.postMessage(rpcData, getRpcTransferList(rpcData)),
              on: fn => { port.onmessage = (ev: MessageEvent) => fn(ev.data) },
              serialize: serializeRpcMessage,
              deserialize: deserializeRpcMessage,
              timeout: 30_000,
            },
          )

          // Requests can be forwarded again. The waiting ones go on before the client hears that
          // the connection is established.
          connectWorker({ port, rpc })

          // Notify the originating client that the connection is established
          if (clientId) {
            const client = await serviceWorkerScope.clients.get(clientId)
            client?.postMessage({ type: 'V_WW_CONNECT_PORT_ACK' })
          }

          debug?.('Worker RPC established via birpc')
        }
      }
      return
    }

    // vite:mc:init: iframe HMR port — forward to WW via the birpc MessagePort
    if (event.data.type === 'vite:mc:init' && event.ports[0]) {
      const hmrPort = event.ports[0]
      const hmrClientId = event.data.clientId
      debug?.('HMR port received from iframe, forwarding to WW', hmrClientId)
      void waitForWorker().then((channel) => {
        if (!channel) {
          hmrPort.close()
          return
        }
        channel.port.postMessage({ type: 'V_WW_HMR_PORT', clientId: hmrClientId }, [hmrPort])
      })
    }
  }

  const closeHttpServer = createServerCloseFn(httpServer)
  let closeServerPromise: Promise<void> | undefined
  const server: ServiceWorkerServer = {
    httpServer,
    close() {
      if (!closeServerPromise) {
        closeServerPromise = closeHttpServer()
      }
      return closeServerPromise
    },
  }

  /**
   * Start answering requests and accepting the Web Worker channels.
   */
  async function listen(): Promise<ServiceWorkerServer> {
    httpServer.on('connection', onConnection)
    httpServer.listen({ enableListenConnections: true })
    return server
  }

  return listen
}

export function createServerCloseFn(
  server: HttpServer | null,
): () => Promise<void> {
  if (!server) {
    return () => Promise.resolve()
  }

  let hasListened = false
  server.once('listening', () => {
    hasListened = true
  })

  return () =>
    new Promise<void>((resolve, reject) => {
      if (hasListened) {
        server.close((err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
}

// === Protocol message types & constants ===
export {
  V_WW_CONNECT_PORT,
  V_WW_CONNECT_PORT_ACK,
  V_WW_SW_CHANNEL_READY
} from '../shared/messages'
export type {
  ConnectWebWorkerPortAckMessage, ConnectWebWorkerPortMessage, WebWorkerServiceWorkerChannelReadyMessage
} from '../shared/messages'
