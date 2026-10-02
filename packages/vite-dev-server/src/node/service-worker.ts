/**
 * Service Worker entry point for @vrowzer/vite-dev-server
 *
 * The Service Worker forwards each request within the base path to the Web Worker that owns it,
 * which has the project files, the module graph and the plugins, and answers the request with the
 * Vite middlewares. It also forwards the HMR ports of the previews to their Web Workers.
 *
 * Several runtimes, e.g. in two tabs, can share the Service Worker. Each runtime connects its Web
 * Worker with its runtime ID, and its previews have the ID as the first path segment within the
 * base path, e.g. `/__preview__/0123456789ab/src/main.ts`.
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
  DisconnectWebWorkerPortMessage,
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
   * How long a request waits for the Web Worker of its owner to connect, in milliseconds. A request
   * that no Web Worker can answer by then gets a `503` response.
   *
   * A restarted Service Worker has no Web Worker channels until the runtimes connect them again, so
   * the requests made in the meantime wait for them.
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
 * A channel with the Web Worker of a runtime, after the handshake.
 */
interface WorkerChannel {
  port: MessagePort
  rpc: BirpcReturn<WorkerFunctions, ServiceWorkerFunctions>
  /**
   * The page of the runtime, which sent the port
   */
  clientId: string | undefined
}

const DEFAULT_OWNER_WAIT_TIMEOUT = 10_000

/**
 * The ID of a runtime, which owns a Web Worker channel and the previews under its path.
 *
 * @see {@link ConnectWebWorkerPortMessage.runtimeId}
 */
const RUNTIME_ID_PATTERN = /^[0-9a-f]{12}$/

function isRuntimeId(value: unknown): value is string {
  return typeof value === 'string' && RUNTIME_ID_PATTERN.test(value)
}

/**
 * Returns the runtime that a path within the base path names as its first segment, e.g.
 * `0123456789ab` for `/__preview__/0123456789ab/src/main.ts`, or `undefined` when it names none.
 *
 * @param pathname - A URL path, or the Vite base of a preview
 * @param baseRoot - The base path, with a trailing slash
 */
function ownerOfPath(pathname: string, baseRoot: string): string | undefined {
  if (!pathname.startsWith(baseRoot)) {
    return undefined
  }
  const rest = pathname.slice(baseRoot.length)
  const end = rest.indexOf('/')
  if (end === -1) {
    return undefined
  }
  const owner = rest.slice(0, end)
  return isRuntimeId(owner) ? owner : undefined
}

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
  const baseRoot = basePath.endsWith('/') ? basePath : `${basePath}/`
  const ownerWaitTimeout = options.ownerWaitTimeout ?? DEFAULT_OWNER_WAIT_TIMEOUT
  const workerOrigin = new URL(serviceWorkerScope.location.href).origin

  // The Web Worker channels, by the runtime that owns them
  const owners = new Map<string, WorkerChannel>()
  // Runtimes that were disposed or whose pages are closed. Their previews get 404.
  const releasedOwners = new Set<string>()
  // Requests and HMR ports waiting for the Web Worker of a runtime to connect
  const ownerWaiters = new Map<string, Set<(channel: WorkerChannel | null) => void>>()

  /**
   * Wait for the Web Worker of `owner` to connect, for `ownerWaitTimeout` at most.
   *
   * @returns The channel, or `null` when the Web Worker did not connect in time or the runtime was
   * released
   */
  function waitForOwner(owner: string): Promise<WorkerChannel | null> {
    const connected = owners.get(owner)
    if (connected) {
      return Promise.resolve(connected)
    }
    return new Promise((resolve) => {
      let waiters = ownerWaiters.get(owner)
      if (!waiters) {
        waiters = new Set()
        ownerWaiters.set(owner, waiters)
      }
      const onConnect = (channel: WorkerChannel | null) => {
        clearTimeout(timer)
        resolve(channel)
      }
      const timer = setTimeout(() => {
        const current = ownerWaiters.get(owner)
        current?.delete(onConnect)
        if (current?.size === 0) {
          ownerWaiters.delete(owner)
        }
        resolve(null)
      }, ownerWaitTimeout)
      waiters.add(onConnect)
    })
  }

  function closeChannel(channel: WorkerChannel, reason: string): void {
    // Reject the requests still waiting for this channel, whose replies never come
    channel.rpc.$close(new Error(`[@vrowzer/vite-dev-server] ${reason}`))
    channel.port.close()
  }

  function settleOwnerWaiters(owner: string, channel: WorkerChannel | null): void {
    const waiters = ownerWaiters.get(owner)
    ownerWaiters.delete(owner)
    for (const waiter of waiters ?? []) {
      waiter(channel)
    }
  }

  function connectOwner(owner: string, channel: WorkerChannel): void {
    const previous = owners.get(owner)
    owners.set(owner, channel)
    releasedOwners.delete(owner)
    // The runtime connected its Web Worker again, which has closed the previous port
    if (previous) {
      closeChannel(previous, `The Web Worker channel of ${owner} was replaced`)
    }
    settleOwnerWaiters(owner, channel)
  }

  /**
   * Release a runtime that was disposed or whose page is closed. Its previews get 404 from now on.
   */
  function releaseOwner(owner: string, reason: string): void {
    releasedOwners.add(owner)
    const channel = owners.get(owner)
    owners.delete(owner)
    if (channel) {
      closeChannel(channel, reason)
    }
    settleOwnerWaiters(owner, null)
  }

  /**
   * Release the runtimes whose pages are closed. A closed page cannot send
   * `V_WW_DISCONNECT_PORT`, so this runs when another runtime connects.
   */
  async function releaseClosedOwners(): Promise<void> {
    const pages = await serviceWorkerScope.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const openPages = new Set(pages.map((page) => page.id))
    for (const [owner, channel] of owners) {
      if (channel.clientId !== undefined && !openPages.has(channel.clientId)) {
        debug?.('Releasing the runtime of a closed page', owner)
        releaseOwner(owner, `The page of ${owner} is closed`)
      }
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

  // The Web Worker of the runtime named in the URL answers the request with the Vite middlewares
  middlewares.use(async (c) => {
    const owner = ownerOfPath(c.req.path, baseRoot)
    // A preview URL names the runtime that owns it, so nothing answers a URL without one, or one
    // of a released runtime
    if (owner === undefined || releasedOwners.has(owner)) {
      return c.body(null, 404)
    }
    const channel = await waitForOwner(owner)
    if (!channel && releasedOwners.has(owner)) {
      return c.body(null, 404)
    }
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
      const runtimeId = event.data.runtimeId
      const clientId = event.clientId
      // Without its runtime ID, no request can be forwarded to the Web Worker
      if (!isRuntimeId(runtimeId)) {
        debug?.('Worker port without a valid runtime ID', runtimeId)
        port.close()
        return
      }
      debug?.('Worker port received via connection event', runtimeId)

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

          // The requests of the runtime can be forwarded now. The waiting ones go on before the
          // client hears that the connection is established.
          connectOwner(runtimeId, { port, rpc, clientId })
          void releaseClosedOwners().catch((error: unknown) => {
            debug?.('Could not look for closed pages', error)
          })

          // Notify the originating client that the connection is established. Runtimes in the same
          // page receive each other's acknowledgements, so it names the runtime.
          if (clientId) {
            const client = await serviceWorkerScope.clients.get(clientId)
            client?.postMessage({ type: 'V_WW_CONNECT_PORT_ACK', runtimeId })
          }

          debug?.('Worker RPC established via birpc')
        }
      }
      return
    }

    // vite:mc:init: iframe HMR port — forward to the WW of the runtime named in the Vite base
    if (event.data.type === 'vite:mc:init' && event.ports[0]) {
      const hmrPort = event.ports[0]
      const { base, clientId: hmrClientId } = event.data
      const owner = typeof base === 'string' ? ownerOfPath(base, baseRoot) : undefined
      if (owner === undefined || releasedOwners.has(owner)) {
        debug?.('HMR port without the base of a connected runtime', hmrClientId, base)
        hmrPort.close()
        return
      }
      debug?.('HMR port received from iframe, forwarding to WW', owner, hmrClientId)
      void waitForOwner(owner).then((channel) => {
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

  // V_WW_DISCONNECT_PORT: a disposed runtime releases its previews. It has no ports, so it is not a
  // connection of the server.
  function onMessage(event: ExtendableMessageEvent): void {
    const message = event.data as Partial<DisconnectWebWorkerPortMessage> | null
    if (message?.type !== 'V_WW_DISCONNECT_PORT') {
      return
    }
    if (!isRuntimeId(message.runtimeId)) {
      debug?.('V_WW_DISCONNECT_PORT without a valid runtime ID', message.runtimeId)
      return
    }
    debug?.('Releasing a disposed runtime', message.runtimeId)
    releaseOwner(message.runtimeId, `The runtime ${message.runtimeId} was disposed`)
  }

  /**
   * Start answering requests and accepting the Web Worker channels.
   */
  async function listen(): Promise<ServiceWorkerServer> {
    httpServer.on('connection', onConnection)
    serviceWorkerScope.addEventListener('message', onMessage)
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
  V_WW_DISCONNECT_PORT,
  V_WW_SW_CHANNEL_READY
} from '../shared/messages'
export type {
  ConnectWebWorkerPortAckMessage, ConnectWebWorkerPortMessage, DisconnectWebWorkerPortMessage,
  WebWorkerServiceWorkerChannelReadyMessage
} from '../shared/messages'
