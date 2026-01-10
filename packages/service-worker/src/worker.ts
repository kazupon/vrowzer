/**
 * Service Worker Module
 *
 * > [!IMPORTANT]
 * > This module is intended for use within service workers.
 * > It cannot be used in regular JavaScript applications.
 *
 * This module provides a Proxy-based wrapper for Service Workers that:
 * - Transparently accesses all native {@link ServiceWorkerGlobalScope} APIs
 * - Handles protocol messages defined in {@link module:protocols}
 *
 * ## Features
 * - Service Worker version management
 * - Optional execution of `skipWaiting`
 *
 * ## Usage
 * ```typescript
 * const sw = createSvcWorker(self, { version: '1.0.0' })
 *
 * // Native APIs work transparently
 * sw.addEventListener('fetch', (event) => { ... })
 *
 * // Extended properties
 * console.log(sw.version)
 * ```
 *
 * @module worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import {
  VROWSER_SW_SESSION_PONG,
  VROWSER_SW_SESSION_CLOSE,
  VROWSER_SW_SESSION_INIT,
  VROWSER_SW_SESSION_REQUEST,
  VROWSER_SW_SKIP_WAITING,
  VROWSER_SW_VERSION,
  createSvcWorkerSessionRequestResponse,
  createSvcWorkerSessionInitResponse,
  createSvcWorkerSessionPingMessage,
  createSvcWorkerVersionResponse
} from './protocols.ts'

import type {
  SvcWorkerMessage,
  SvcWorkerSessionMessage,
  SvcWorkerSessionRequest,
  SvcWorkerSessionResponse
} from './protocols.ts'

/**
 * Service Worker Error
 */
export class SvcWorkerError extends Error {
  name = 'SvcWorkerError'
  constructor(message: string, cause?: Error) {
    super(message, { cause })
  }
}

/**
 * Session info stored for each connected client
 */
interface SessionInfo {
  port: MessagePort
  lastPong: number
}

/**
 * Service Worker options for {@link createSvcWorker}
 */
export interface SvcWorkerOptions {
  /**
   * The version of this service worker
   * This is used to identify the service worker when communicating with {@link SvcWorkerController}
   */
  version: string

  /**
   * Heartbeat interval in milliseconds
   * @default 30000
   */
  heartbeatInterval?: number

  /**
   * Timeout after which a session is considered stale (no PONG received)
   * @default 60000
   */
  sessionTimeout?: number

  /**
   * Debug logger function
   */
  debug?: Console['debug']
}

/**
 * Session request handler function type
 */
export type SessionRequestHandler = (
  request: SvcWorkerSessionRequest,
  clientId: string
) => Promise<SvcWorkerSessionResponse> | SvcWorkerSessionResponse

/**
 * Service Worker interface that extends {@link ServiceWorkerGlobalScope}
 *
 * This interface provides transparent access to all native Service Worker APIs
 * while adding version management capabilities.
 */
export interface SvcWorker extends ServiceWorkerGlobalScope, Disposable {
  /**
   * The version of this service worker
   */
  readonly version: string
  /**
   * The number of active sessions
   */
  readonly sessionCount: number
  /**
   * Register a handler for session requests
   */
  onSessionRequest(handler: SessionRequestHandler): void
  /**
   * Dispose the service worker and clean up resources
   */
  dispose(): void
}

/**
 * Create a Service Worker wrapper with Proxy-based transparent access
 *
 * @param self - The {@link ServiceWorkerGlobalScope} instance (typically `self` in a service worker)
 * @param options - Configuration options including version
 * @returns A {@link SvcWorker} instance that wraps the native service worker
 *
 * @example
 * ```typescript
 * const sw = createSvcWorker(self, { version: '1.0.0' })
 *
 * sw.addEventListener('fetch', (event) => {
 *   event.respondWith(fetch(event.request))
 * })
 * ```
 */
export function createSvcWorker(
  self: ServiceWorkerGlobalScope,
  options: SvcWorkerOptions
): SvcWorker {
  const { version, heartbeatInterval = 30000, sessionTimeout = 60000, debug } = options

  debug?.('createSvcWorker: initializing with version', version)

  // Session management
  const sessions = new Map<string, SessionInfo>()
  let sessionRequestHandler: SessionRequestHandler | null = null
  let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null

  // Handle session port messages
  function createSessionPortHandler(clientId: string, port: MessagePort) {
    return function handleSessionMessage(event: MessageEvent<SvcWorkerSessionMessage>) {
      const data = event.data

      if (!data || typeof data !== 'object' || !('type' in data)) {
        return
      }

      debug?.('createSvcWorker: session message from', clientId, data.type)

      switch (data.type) {
        case VROWSER_SW_SESSION_CLOSE: {
          debug?.('createSvcWorker: session close from', clientId)
          port.close()
          sessions.delete(clientId)
          break
        }

        case VROWSER_SW_SESSION_PONG: {
          const session = sessions.get(clientId)
          if (session) {
            session.lastPong = Date.now()
            debug?.('createSvcWorker: PONG received from', clientId)
          }
          break
        }

        case VROWSER_SW_SESSION_REQUEST: {
          if (sessionRequestHandler) {
            const request = data
            Promise.resolve(sessionRequestHandler(request, clientId))
              .then(response => {
                port.postMessage(createSvcWorkerSessionRequestResponse(response))
              })
              .catch((error: unknown) => {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                const response: SvcWorkerSessionResponse = {
                  id: request.id,
                  success: false,
                  error: errorMessage
                }
                port.postMessage(createSvcWorkerSessionRequestResponse(response))
              })
          }
          break
        }

        default: {
          console.warn('createSvcWorker: unknown session message type received:', data)
          break
        }
      }
    }
  }

  // Heartbeat: send PING to all sessions
  function startHeartbeat() {
    if (heartbeatIntervalId !== null) {
      return
    }

    heartbeatIntervalId = setInterval(() => {
      const now = Date.now()

      for (const [clientId, session] of sessions) {
        // Check if session is stale
        if (now - session.lastPong > sessionTimeout) {
          debug?.('createSvcWorker: session timeout, removing', clientId)
          session.port.close()
          sessions.delete(clientId)
          continue
        }

        // Send PING
        const pingId = crypto.randomUUID()
        debug?.('createSvcWorker: sending PING to', clientId, pingId)
        session.port.postMessage(createSvcWorkerSessionPingMessage(pingId))
      }
    }, heartbeatInterval)
  }

  function stopHeartbeat() {
    if (heartbeatIntervalId !== null) {
      clearInterval(heartbeatIntervalId)
      heartbeatIntervalId = null
    }
  }

  // Cleanup stale sessions using clients.matchAll()
  async function cleanupStaleSessions() {
    const clients = await self.clients.matchAll({
      includeUncontrolled: true,
      type: 'window'
    })
    const activeClientIds = new Set(clients.map(c => c.id))

    for (const [clientId, session] of sessions) {
      if (!activeClientIds.has(clientId)) {
        debug?.('createSvcWorker: orphaned session, removing', clientId)
        session.port.close()
        sessions.delete(clientId)
      }
    }
  }

  // Register message handler for protocols
  function registerMessageHandler() {
    function handleMessage(event: ExtendableMessageEvent) {
      const data = event.data as SvcWorkerMessage
      if (!data || typeof data.type !== 'string') {
        return
      }
      debug?.('createSvcWorker: received message', data.type)

      switch (data.type) {
        case VROWSER_SW_VERSION: {
          const port = event.ports?.[0]
          if (port) {
            debug?.('createSvcWorker: responding with version', version)
            port.postMessage(createSvcWorkerVersionResponse(version))
          }
          break
        }

        case VROWSER_SW_SKIP_WAITING: {
          debug?.('createSvcWorker: executing skipWaiting')
          // eslint-disable-next-line @typescript-eslint/no-floating-promises -- Intentional
          self.skipWaiting()
          break
        }

        case VROWSER_SW_SESSION_INIT: {
          const port = event.ports?.[0]
          const clientId = (event.source as Client | null)?.id

          if (!port || !clientId) {
            debug?.('createSvcWorker: SESSION_INIT missing port or clientId')
            break
          }

          debug?.('createSvcWorker: SESSION_INIT from', clientId)

          // Cleanup any existing session for this client
          const existingSession = sessions.get(clientId)
          if (existingSession) {
            existingSession.port.close()
          }

          // Setup new session
          const handler = createSessionPortHandler(clientId, port)
          port.addEventListener('message', handler)
          port.start()

          sessions.set(clientId, {
            port,
            lastPong: Date.now()
          })

          // Start heartbeat if not already running
          startHeartbeat()

          // Cleanup stale sessions on new connection
          // eslint-disable-next-line @typescript-eslint/no-floating-promises -- Intentional
          cleanupStaleSessions()

          // Send init response
          port.postMessage(createSvcWorkerSessionInitResponse(true, version))
          break
        }

        default: {
          // Unknown message type; ignore
          console.warn('createSvcWorker: unknown message type received:', data)
          break
        }
      }
    }
    self.addEventListener('message', handleMessage)
    return () => {
      self.removeEventListener('message', handleMessage)
    }
  }
  const stopMessageHandler = registerMessageHandler()

  function cleanup() {
    stopHeartbeat()
    stopMessageHandler()

    // Close all sessions
    for (const [clientId, session] of sessions) {
      debug?.('createSvcWorker: closing session', clientId)
      session.port.close()
    }
    sessions.clear()
  }

  function dispose() {
    debug?.('createSvcWorker: disposing')
    cleanup()
  }

  function onSessionRequest(handler: SessionRequestHandler) {
    sessionRequestHandler = handler
  }

  // Extension properties and methods
  const extensions: Record<string | symbol, unknown> = {
    get version() {
      return version
    },
    get sessionCount() {
      return sessions.size
    },
    onSessionRequest,
    dispose,
    [Symbol.dispose]: dispose
  }

  // Create Proxy for transparent access to native APIs
  return new Proxy(self, {
    get(target, prop, receiver) {
      // Check extension properties first
      if (prop in extensions) {
        const ext = extensions
        const descriptor = Object.getOwnPropertyDescriptor(ext, prop)
        if (descriptor?.get) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- for generic
          return descriptor.get.call(ext)
        }

        const value = ext[prop]
        if (typeof value === 'function') {
          return (value as (...args: unknown[]) => unknown).bind(ext)
        }

        return value
      }

      // Fallback to native property
      const value = Reflect.get(target, prop, receiver) // eslint-disable-line @typescript-eslint/no-unsafe-assignment -- for generic
      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(target)
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- for generic
      return value
    },

    set(target, prop, value, receiver) {
      // Readonly extension properties
      if (prop === 'version' || prop === 'sessionCount') {
        throw new TypeError(`Cannot assign to read only property '${String(prop)}'`)
      }

      // Fallback to native property
      return Reflect.set(target, prop, value, receiver)
    },

    has(target, prop) {
      return prop in extensions || Reflect.has(target, prop)
    }
  }) as SvcWorker
}
