import type { ErrorPayload, FullReloadPayload, HotPayload } from '#types/hmrPayload'
import { Emitter } from '@kazupon/jts-utils/event'
import { safeMessagePort } from '@kazupon/jts-utils/message/port'
import type { ConnectionEvent } from '@vrowser/service-worker-server'
import type { HttpServer } from '.'
import type { InferCustomEventPayload } from '..'
import type { ResolvedConfig } from '../config'
import type { NormalizedHotChannel, NormalizedHotChannelClient } from './hmr'

type SafeMessagePort = ReturnType<typeof safeMessagePort>

/* In Bun, the `ws` module is overridden to hook into the native code. Using the bundled `js` version
 * of `ws` will not work as Bun's req.socket does not allow reading/writing to the underlying socket.
 */
// const WebSocketServerRaw = process.versions.bun
//   ? // @ts-expect-error: Bun defines `import.meta.require`
//   import.meta.require('ws').WebSocketServer
//   : WebSocketServerRaw_

export const HMR_HEADER = 'vite-hmr'

// MessageChannel connection events
const MC_INIT_EVENT = 'vite:mc:init'

/**
 * Custom listener type for MessageChannel events
 */
export type MessageChannelCustomListener<T> = (
  data: T,
  client: MessageChannelClient,
) => void

export const isMessageChannelServer: unique symbol = Symbol('isMessageChannelServer')

// NOTE(kazupon): Disable orignal WebSocket server implementation
// export const isWebSocketServer: unique symbol = Symbol('isWebSocketServer')
//
// export interface WebSocketServer extends NormalizedHotChannel {
//   /**
//    * Handle custom event emitted by `import.meta.hot.send`
//    */
//   on: WebSocketTypes.Server['on'] & {
//     <T extends string>(
//       event: T,
//       listener: WebSocketCustomListener<InferCustomEventPayload<T>>,
//     ): void
//   }
//   /**
//    * Unregister event listener.
//    */
//   off: WebSocketTypes.Server['off'] & {
//     (event: string, listener: Function): void
//   }
//   /**
//    * Listen on port and host
//    */
//   listen(): void
//   /**
//    * Disconnect all clients and terminate the server.
//    */
//   close(): Promise<void>
//
//   [isWebSocketServer]: true
//   /**
//    * Get all connected clients.
//    */
//   clients: Set<WebSocketClient>
// }

/**
 * MessageChannel-based HMR server interface
 *
 * This interface provides a MessageChannel-based alternative to WebSocket
 * for HMR communication in Service Worker environments.
 */
export interface MessageChannelServer extends NormalizedHotChannel {
  /**
   * Handle custom event emitted by `import.meta.hot.send`
   */
  on: {
    <T extends string>(
      event: T,
      listener: MessageChannelCustomListener<InferCustomEventPayload<T>>,
    ): void
    (event: 'connection', listener: (port: MessagePort) => void): void
    (event: 'close', listener: () => void): void
    (event: 'error', listener: (error: Error) => void): void
  }
  /**
   * Unregister event listener.
   */
  off: {
    (event: string, listener: Function): void
  }
  /**
   * Listen on port and host
   */
  listen(): void
  /**
   * Disconnect all clients and terminate the server.
   */
  close(): Promise<void>

  [isMessageChannelServer]: true
  /**
   * Get all connected clients.
   */
  clients: Set<MessageChannelClient>
}

// NOTE(kazupon): Disable orignal WebSocket server implementation
// export interface WebSocketClient extends NormalizedHotChannelClient {
//   /**
//    * The raw WebSocket instance
//    * @advanced
//    */
//   socket: WebSocketTypes
// }

/**
 * MessageChannel client interface
 */
export interface MessageChannelClient extends NormalizedHotChannelClient {
  /**
   * The MessagePort instance
   */
  port: MessagePort
  /**
   * The client ID if available
   */
  clientId?: string
}

// Server events that should be forwarded to the internal emitter
const serverEvents = ['connection', 'close', 'error']

function noop() {
  // noop
}

/**
 * Create a noop MessageChannel server for when HMR is disabled
 */
function createNoopMessageChannelServer(): MessageChannelServer {
  return {
    [isMessageChannelServer]: true,
    get clients() {
      return new Set<MessageChannelClient>()
    },
    async close() {
      // noop
    },
    on: noop as MessageChannelServer['on'],
    off: noop as MessageChannelServer['off'],
    setInvokeHandler: noop,
    handleInvoke: async () => ({
      error: {
        name: 'TransportError',
        message: 'handleInvoke not implemented',
        stack: new Error().stack,
      },
    }),
    listen: noop,
    send: noop,
  }
}

/**
 * Create a MessageChannel-based server.
 *
 * This function provides MessageChannel-based HMR for Service Worker environments,
 * inspired by Vite's `createWebSocketServer` function.
 *
 * @param server - The HttpServer (SvcWorkerServer) instance
 * @param config - The resolved Vite config
 * @returns A MessageChannelServer instance
 */
export function createMessageChannelServer(
  server: HttpServer,
  config: ResolvedConfig,
): MessageChannelServer {
  // Return noop server if HMR is disabled
  if (config.server?.ws === false) {
    return createNoopMessageChannelServer()
  }

  // Internal state
  const safePorts = new Set<SafeMessagePort>()
  const clientsMap = new WeakMap<SafeMessagePort, MessageChannelClient>()
  const customListeners = new Map<string, Set<MessageChannelCustomListener<any>>>()
  const serverEmitter = Emitter<{ connection: MessagePort; close: void; error: Error }>()

  // On page reloads, if a file fails to compile and returns 500, the server
  // sends the error payload before the client connection is established.
  // If we have no open clients, buffer the error and send it to the next
  // connected client.
  // The same thing may happen when the optimizer runs fast enough to
  // finish the bundling before the client connects.
  let bufferedMessage: ErrorPayload | FullReloadPayload | null = null

  /**
   * Get or create a MessageChannelClient wrapper for a safe port
   */
  function getPortClient(safePort: SafeMessagePort, clientId?: string): MessageChannelClient {
    if (!clientsMap.has(safePort)) {
      const client: MessageChannelClient = {
        send: (...args: unknown[]) => {
          let payload: HotPayload
          if (typeof args[0] === 'string') {
            payload = {
              type: 'custom',
              event: args[0],
              data: args[1],
            }
          } else {
            payload = args[0] as HotPayload
          }
          safePort.postMessage(payload)
        },
        // TODO(kazupon): check `@kazupon/jts-utils/message/port` type
        port: safePort.port,
      }
      if (clientId !== undefined) {
        client.clientId = clientId
      }
      clientsMap.set(safePort, client)
    }
    return clientsMap.get(safePort)!
  }

  /**
   * Emit a custom event to registered listeners
   */
  function emitCustomEvent<T extends string>(
    event: T,
    data: InferCustomEventPayload<T>,
    safePort: SafeMessagePort,
    clientId?: string,
  ) {
    const listeners = customListeners.get(event)
    if (!listeners?.size) return

    const client = getPortClient(safePort, clientId)
    for (const listener of listeners) {
      listener(data, client)
    }
  }

  /**
   * Handle incoming connection from client
   */
  function handleConnection(event: ConnectionEvent<unknown>) {
    // Only process vite:mc:init events with a port
    const data = event.data as { type?: string } | undefined
    if (data?.type !== MC_INIT_EVENT || !event.ports[0]) {
      return
    }

    const rawPort = event.ports[0]
    const clientId = event.clientId

    // Wrap the raw port with safeMessagePort for safer event handling
    const safePort = safeMessagePort(rawPort)

    // Track the safe port
    safePorts.add(safePort)

    // Set up message handler using safeMessagePort's on method
    safePort.on('message', (msgEvent: MessageEvent) => {
      const data = msgEvent.data as HotPayload

      // Ignore ping messages (used for keep-alive)
      if (data?.type === 'ping') return

      // Handle custom events
      if (data?.type === 'custom' && data?.event) {
        emitCustomEvent(data.event, data.data, safePort, clientId)
      }
    })

    // Set up error handler using safeMessagePort's on method
    safePort.on('messageerror', (err: MessageEvent) => {
      console.error(`[vrowser] MessageChannel error:`, err)
      serverEmitter.emit('error', err as unknown as Error)
    })

    // Emit connection event (emit with raw port for backward compatibility)
    serverEmitter.emit('connection', rawPort)
    emitCustomEvent('vite:client:connect', undefined, safePort, clientId)

    // Echo back the init event for handshake confirmation
    safePort.postMessage({ type: MC_INIT_EVENT })
    // Send connected message
    safePort.postMessage({ type: 'connected' })

    // Send any buffered message
    if (bufferedMessage) {
      safePort.postMessage(bufferedMessage)
      bufferedMessage = null
    }
  }

  // Register connection handler on server
  server.on('connection', handleConnection)

  // Create the MessageChannelServer instance
  const mcServer: MessageChannelServer = {
    send(payload: HotPayload) {
      // Buffer error/full-reload if no clients connected
      if (
        (payload.type === 'error' || payload.type === 'full-reload') &&
        !safePorts.size
      ) {
        bufferedMessage = payload
        return
      }

      // Broadcast to all connected clients
      for (const safePort of safePorts) {
        safePort.postMessage(payload)
      }
    },

    on: ((event: string, fn: (...args: unknown[]) => void) => {
      if (serverEvents.includes(event)) {
        // Type-safe event handling for server events
        if (event === 'connection') {
          serverEmitter.on('connection', fn as (port: MessagePort) => void)
        } else if (event === 'close') {
          serverEmitter.on('close', fn as () => void)
        } else if (event === 'error') {
          serverEmitter.on('error', fn as (error: Error) => void)
        }
        return
      }
      if (!customListeners.has(event)) {
        customListeners.set(event, new Set())
      }
      customListeners.get(event)!.add(fn as MessageChannelCustomListener<unknown>)
    }) as MessageChannelServer['on'],

    off: ((event: string, fn: Function) => {
      if (serverEvents.includes(event)) {
        // Type-safe event handling for server events
        if (event === 'connection') {
          serverEmitter.off('connection', fn as (port: MessagePort) => void)
        } else if (event === 'close') {
          serverEmitter.off('close', fn as () => void)
        } else if (event === 'error') {
          serverEmitter.off('error', fn as (error: Error) => void)
        }
        return
      }
      customListeners.get(event)?.delete(fn as MessageChannelCustomListener<unknown>)
    }) as MessageChannelServer['off'],

    listen() {
      server.listenConnections()
    },

    async close() {
      // Notify all clients of disconnection
      for (const safePort of safePorts) {
        emitCustomEvent('vite:client:disconnect', undefined, safePort)
        safePort.postMessage({
          type: 'custom',
          event: 'vite:ws:disconnect',
          data: {},
        })
        safePort.close()
      }
      safePorts.clear()

      // Remove server listener
      server.off('connection', handleConnection)

      // Emit close event
      serverEmitter.emit('close')

      // Close server connections
      return new Promise<void>((resolve) => {
        server.closeConnections(() => resolve())
      })
    },

    setInvokeHandler: noop,
    handleInvoke: async () => ({
      error: {
        name: 'TransportError',
        message: 'handleInvoke not implemented',
        stack: new Error().stack,
      },
    }),

    [isMessageChannelServer]: true,

    get clients() {
      return new Set(Array.from(safePorts).map((safePort) => getPortClient(safePort)))
    },
  }

  return mcServer
}

//
// NOTE(kazupon):
// Disable orignal WebSocket server implementation,
// because commented out codes as a context hint for sync with the original code from the forked source using the AI agent.
//
// export function createWebSocketServer(
//   server: HttpServer | null,
//   config: ResolvedConfig,
//   httpsOptions?: HttpsServerOptions,
// ): WebSocketServer {
//   if (config.server.ws === false) {
//     return {
//       [isWebSocketServer]: true,
//       get clients() {
//         return new Set<WebSocketClient>()
//       },
//       async close() {
//         // noop
//       },
//       on: noop as any as WebSocketServer['on'],
//       off: noop as any as WebSocketServer['off'],
//       setInvokeHandler: noop,
//       handleInvoke: async () => ({
//         error: {
//           name: 'TransportError',
//           message: 'handleInvoke not implemented',
//           stack: new Error().stack,
//         },
//       }),
//       listen: noop,
//       send: noop,
//     }
//   }
//
//   let wsHttpServer: Server | undefined = undefined
//
//   const hmr = isObject(config.server.hmr) && config.server.hmr
//   const hmrServer = hmr && hmr.server
//   const hmrPort = hmr && hmr.port
//   // TODO: the main server port may not have been chosen yet as it may use the next available
//   const portsAreCompatible = !hmrPort || hmrPort === config.server.port
//   const wsServer = hmrServer || (portsAreCompatible && server)
//   let hmrServerWsListener: (
//     req: InstanceType<typeof IncomingMessage>,
//     socket: Duplex,
//     head: Buffer,
//   ) => void
//   const customListeners = new Map<string, Set<WebSocketCustomListener<any>>>()
//   const clientsMap = new WeakMap<WebSocketRaw, WebSocketClient>()
//   const port = hmrPort || 24678
//   const host = (hmr && hmr.host) || undefined
//   const allowedHosts =
//     config.server.allowedHosts === true
//       ? config.server.allowedHosts
//       : Object.freeze([...config.server.allowedHosts]) // Freeze the array to allow caching
//
//   const shouldHandle = (req: IncomingMessage) => {
//     const protocol = req.headers['sec-websocket-protocol']!
//     // vite-ping is allowed to connect from anywhere
//     // because it needs to be connected before the client fetches the new `/@vite/client`
//     // this is fine because vite-ping does not receive / send any meaningful data
//     if (protocol === 'vite-ping') return true
//
//     if (
//       allowedHosts !== true &&
//       !isHostAllowed(req.headers.host, allowedHosts)
//     ) {
//       return false
//     }
//
//     if (config.legacy?.skipWebSocketTokenCheck) {
//       return true
//     }
//
//     // If the Origin header is set, this request might be coming from a browser.
//     // Browsers always sets the Origin header for WebSocket connections.
//     if (req.headers.origin) {
//       const parsedUrl = new URL(`http://example.com${req.url!}`)
//       return hasValidToken(config, parsedUrl)
//     }
//
//     // We allow non-browser requests to connect without a token
//     // for backward compat and convenience
//     // This is fine because if you can sent a request without the SOP limitation,
//     // you can also send a normal HTTP request to the server.
//     return true
//   }
//   const handleUpgrade = (
//     req: IncomingMessage,
//     socket: Duplex,
//     head: Buffer,
//     isPing: boolean,
//   ) => {
//     wss.handleUpgrade(req, socket as Socket, head, (ws) => {
//       // vite-ping is allowed to connect from anywhere
//       // we close the connection immediately without connection event
//       // so that the client does not get included in `wss.clients`
//       if (isPing) {
//         ws.close(/* Normal Closure */ 1000)
//         return
//       }
//       wss.emit('connection', ws, req)
//     })
//   }
//   const wss: WebSocketServerRaw_ = new WebSocketServerRaw({ noServer: true })
//   wss.shouldHandle = shouldHandle
//
//   if (wsServer) {
//     let hmrBase = config.base
//     const hmrPath = hmr ? hmr.path : undefined
//     if (hmrPath) {
//       hmrBase = path.posix.join(hmrBase, hmrPath)
//     }
//     hmrServerWsListener = (req, socket, head) => {
//       const protocol = req.headers['sec-websocket-protocol']!
//       const parsedUrl = new URL(`http://example.com${req.url!}`)
//       if (
//         [HMR_HEADER, 'vite-ping'].includes(protocol) &&
//         parsedUrl.pathname === hmrBase
//       ) {
//         handleUpgrade(req, socket as Socket, head, protocol === 'vite-ping')
//       }
//     }
//     wsServer.on('upgrade', hmrServerWsListener)
//   } else {
//     // http server request handler keeps the same with
//     // https://github.com/websockets/ws/blob/45e17acea791d865df6b255a55182e9c42e5877a/lib/websocket-server.js#L88-L96
//     const route = ((_, res) => {
//       const statusCode = 426
//       const body = STATUS_CODES[statusCode]
//       if (!body)
//         throw new Error(`No body text found for the ${statusCode} status code`)
//
//       res.writeHead(statusCode, {
//         'Content-Length': body.length,
//         'Content-Type': 'text/plain',
//       })
//       res.end(body)
//     }) as Parameters<typeof createHttpServer>[1]
//     // vite dev server in middleware mode
//     // need to call ws listen manually
//     if (httpsOptions) {
//       wsHttpServer = createHttpsServer(httpsOptions, route)
//     } else {
//       wsHttpServer = createHttpServer(route)
//     }
//     wsHttpServer.on('upgrade', (req, socket, head) => {
//       const protocol = req.headers['sec-websocket-protocol']!
//       if (protocol === 'vite-ping' && server && !server.listening) {
//         // reject connection to tell the vite/client that the server is not ready
//         // if the http server is not listening
//         // because the ws server listens before the http server listens
//         req.destroy()
//         return
//       }
//       handleUpgrade(req, socket as Socket, head, protocol === 'vite-ping')
//     })
//     wsHttpServer.on('error', (e: Error & { code: string; port: number }) => {
//       if (e.code === 'EADDRINUSE') {
//         config.logger.error(
//           colors.red(
//             `WebSocket server error: Port ${e.port} is already in use`,
//           ),
//           { error: e },
//         )
//       } else {
//         config.logger.error(
//           colors.red(`WebSocket server error:\n${e.stack || e.message}`),
//           { error: e },
//         )
//       }
//     })
//   }
//
//   const emitCustomEvent = <T extends string>(
//     event: T,
//     data: InferCustomEventPayload<T>,
//     socket: WebSocketRaw,
//   ) => {
//     const listeners = customListeners.get(event)
//     if (!listeners?.size) return
//
//     const client = getSocketClient(socket)
//     for (const listener of listeners) {
//       listener(data, client)
//     }
//   }
//
//   wss.on('connection', (socket) => {
//     socket.on('message', (raw) => {
//       if (!customListeners.size) return
//       let parsed: any
//       try {
//         parsed = JSON.parse(String(raw))
//       } catch { }
//       if (!parsed || parsed.type !== 'custom' || !parsed.event) return
//       emitCustomEvent(parsed.event, parsed.data, socket)
//     })
//     socket.on('error', (err) => {
//       config.logger.error(`${colors.red(`ws error:`)}\n${err.stack}`, {
//         timestamp: true,
//         error: err,
//       })
//     })
//     socket.on('close', () => {
//       emitCustomEvent('vite:client:disconnect', undefined, socket)
//     })
//
//     emitCustomEvent('vite:client:connect', undefined, socket)
//
//     socket.send(JSON.stringify({ type: 'connected' }))
//     if (bufferedMessage) {
//       socket.send(JSON.stringify(bufferedMessage))
//       bufferedMessage = null
//     }
//   })
//
//   wss.on('error', (e: Error & { code: string; port: number }) => {
//     if (e.code === 'EADDRINUSE') {
//       config.logger.error(
//         colors.red(`WebSocket server error: Port ${e.port} is already in use`),
//         { error: e },
//       )
//     } else {
//       config.logger.error(
//         colors.red(`WebSocket server error:\n${e.stack || e.message}`),
//         { error: e },
//       )
//     }
//   })
//
//   // Provide a wrapper to the ws client so we can send messages in JSON format
//   // To be consistent with server.ws.send
//   function getSocketClient(socket: WebSocketRaw) {
//     if (!clientsMap.has(socket)) {
//       clientsMap.set(socket, {
//         send: (...args: any[]) => {
//           let payload: HotPayload
//           if (typeof args[0] === 'string') {
//             payload = {
//               type: 'custom',
//               event: args[0],
//               data: args[1],
//             }
//           } else {
//             payload = args[0]
//           }
//           socket.send(JSON.stringify(payload))
//         },
//         socket,
//       })
//     }
//     return clientsMap.get(socket)!
//   }
//
//   // On page reloads, if a file fails to compile and returns 500, the server
//   // sends the error payload before the client connection is established.
//   // If we have no open clients, buffer the error and send it to the next
//   // connected client.
//   // The same thing may happen when the optimizer runs fast enough to
//   // finish the bundling before the client connects.
//   let bufferedMessage: ErrorPayload | FullReloadPayload | null = null
//
//   const normalizedHotChannel = normalizeHotChannel(
//     {
//       send(payload) {
//         if (
//           (payload.type === 'error' || payload.type === 'full-reload') &&
//           !wss.clients.size
//         ) {
//           bufferedMessage = payload
//           return
//         }
//
//         const stringified = JSON.stringify(payload)
//         wss.clients.forEach((client) => {
//           // readyState 1 means the connection is open
//           if (client.readyState === 1) {
//             client.send(stringified)
//           }
//         })
//       },
//       on(event: string, fn: any) {
//         if (!customListeners.has(event)) {
//           customListeners.set(event, new Set())
//         }
//         customListeners.get(event)!.add(fn)
//       },
//       off(event: string, fn: any) {
//         customListeners.get(event)?.delete(fn)
//       },
//       listen() {
//         wsHttpServer?.listen(port, host)
//       },
//       close() {
//         // should remove listener if hmr.server is set
//         // otherwise the old listener swallows all WebSocket connections
//         if (hmrServerWsListener && wsServer) {
//           wsServer.off('upgrade', hmrServerWsListener)
//         }
//         return new Promise<void>((resolve, reject) => {
//           wss.clients.forEach((client) => {
//             client.terminate()
//           })
//           wss.close((err) => {
//             if (err) {
//               reject(err)
//             } else {
//               if (wsHttpServer) {
//                 wsHttpServer.close((err) => {
//                   if (err) {
//                     reject(err)
//                   } else {
//                     resolve()
//                   }
//                 })
//               } else {
//                 resolve()
//               }
//             }
//           })
//         })
//       },
//     },
//     config.server.hmr !== false,
//     // Don't normalize client as we already handles the send, and to keep `.socket`
//     false,
//   )
//   return {
//     ...normalizedHotChannel,
//
//     on: ((event: string, fn: any) => {
//       if (wsServerEvents.includes(event)) {
//         wss.on(event, fn)
//         return
//       }
//       normalizedHotChannel.on(event, fn)
//     }) as WebSocketServer['on'],
//     off: ((event: string, fn: any) => {
//       if (wsServerEvents.includes(event)) {
//         wss.off(event, fn)
//         return
//       }
//       normalizedHotChannel.off(event, fn)
//     }) as WebSocketServer['off'],
//     async close() {
//       await normalizedHotChannel.close()
//     },
//
//     [isWebSocketServer]: true,
//     get clients() {
//       return new Set(Array.from(wss.clients).map(getSocketClient))
//     },
//   }
// }
