/**
 * Service Worker Module
 *
 * > [!IMPORTANT]
 * > This module is intended for use within service workers.
 * > It cannot be used in regular JavaScript applications.
 *
 * This module provides a Proxy-based wrapper for Service Workers that:
 * - Transparently passes through all native {@link ServiceWorkerGlobalScope} APIs
 * - Handles protocol messages defined in `protocols` module
 *
 * ## Features
 * - Service Worker version management
 * - Optional execution of `skipWaiting`
 * - Session management with MessagePort-based communication
 * - Circuit breaker (suspend/resume) for emergency shutdown
 * - Heartbeat monitoring and stale session cleanup
 *
 * ## Usage
 * ```ts
 * const sw = createSvcWorker(self, { version: '1.0.0' })
 *
 * // Native APIs work transparently
 * sw.addEventListener('fetch', (event) => {
 *   // Check suspended flag for circuit breaker
 *   if (sw.suspended) {
 *     event.respondWith(fetch(event.request))
 *     return
 *   }
 *   // Normal handling...
 * })
 *
 * // Extended properties
 * console.log(sw.version)      // '1.0.0'
 * console.log(sw.suspended)    // false
 * console.log(sw.sessionCount) // 0
 * ```
 *
 * @module worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import {
  V_SW_CLAIM_CLIENTS,
  V_SW_SESSION_CIRCUIT_BREAKER,
  V_SW_SESSION_CLOSE,
  V_SW_SESSION_INIT,
  V_SW_SESSION_PONG,
  V_SW_SESSION_RESUME,
  V_SW_SKIP_WAITING,
  V_SW_VERSION,
  createSvcWorkerSessionCircuitBreakerResponse,
  createSvcWorkerSessionInitResponse,
  createSvcWorkerSessionPingMessage,
  createSvcWorkerSessionResumeResponse,
  createSvcWorkerSessionTerminatedMessage,
  createSvcWorkerVersionResponse
} from './protocols.ts'
import { safePostMessage } from './utils.ts'

import type {
  SvcWorkerMessage,
  SvcWorkerSessionCircuitBreakerMessage,
  SvcWorkerSessionCircuitBreakerResult,
  SvcWorkerSessionMessage,
  SvcWorkerSessionResumeMessage,
  SvcWorkerSessionResumeResult
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
  messageHandler: (event: MessageEvent) => void
  messageErrorHandler: (event: MessageEvent) => void
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
   * Whether the service worker is suspended (circuit breaker engaged).
   *
   * When `true`, fetch handlers should bypass their logic and
   * return `fetch(event.request)` directly.
   *
   * @example
   * ```ts
   * sw.addEventListener('fetch', (event) => {
   *   if (sw.suspended) {
   *     event.respondWith(fetch(event.request))
   *     return
   *   }
   *   // Normal fetch handling...
   * })
   * ```
   */
  readonly suspended: boolean
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
 * ```ts
 * import { createSvcWorker } from '@vrowzer/service-worker/worker'
 *
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
  let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null

  // Circuit breaker state (memory only, not persisted)
  let _suspended = false

  function cleanupSession(
    session: SessionInfo,
    clientId: string,
    sessions: Map<string, SessionInfo>
  ) {
    debug?.('createSvcWorker: cleaning up session', clientId)
    if (session.messageHandler) {
      session.port.removeEventListener('message', session.messageHandler)
    }
    if (session.messageErrorHandler) {
      session.port.removeEventListener('messageerror', session.messageErrorHandler)
    }
    session.port.close()
    sessions.delete(clientId)
  }

  // Circuit breaker handler (built-in, not overridable by user)
  async function handleCircuitBreaker(
    message: SvcWorkerSessionCircuitBreakerMessage,
    port: MessagePort
  ): Promise<void> {
    const cachesCleared: string[] = []

    try {
      if (message.mode === 'suspend') {
        // Suspend: Disable functionality (fetch handlers should bypass)
        _suspended = true
        debug?.('createSvcWorker: circuit breaker suspended')
      }

      // Clear caches if requested
      if (message.clearCaches) {
        const cacheNames = await caches.keys()
        for (const name of cacheNames) {
          await caches.delete(name)
          cachesCleared.push(name)
        }
        debug?.('createSvcWorker: circuit breaker cleared caches', cachesCleared)
      }

      if (message.mode === 'terminate') {
        // Terminate: Service worker unregisters itself
        debug?.('createSvcWorker: circuit breaker terminating')

        // Notify all sessions about termination before unregistering
        const terminatedMessage = createSvcWorkerSessionTerminatedMessage('unregister')
        for (const [clientId, session] of sessions) {
          safePostMessage(session.port, terminatedMessage, {
            context: `terminated notification to ${clientId}`
          })
          cleanupSession(session, clientId, sessions)
        }

        // Stop heartbeat since all sessions are closed
        stopHeartbeat()

        await self.registration.unregister()
      }

      // Send success response (SvcWorkerSessionGenericResponse format)
      const response =
        createSvcWorkerSessionCircuitBreakerResponse<SvcWorkerSessionCircuitBreakerResult>(
          message.id,
          true,
          {
            data: {
              mode: message.mode,
              terminated: message.mode === 'terminate',
              cachesCleared
            }
          }
        )
      safePostMessage(port, response, { context: 'circuit breaker success response' })
    } catch (error) {
      console.error('createSvcWorker: circuit breaker operation failed', error)

      // Send error response
      const response =
        createSvcWorkerSessionCircuitBreakerResponse<SvcWorkerSessionCircuitBreakerResult>(
          message.id,
          false,
          {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        )
      safePostMessage(port, response, { context: 'circuit breaker error response' })
    }
  }

  // Resume handler (built-in, not overridable by user)
  function handleResume(message: SvcWorkerSessionResumeMessage, port: MessagePort): void {
    try {
      // Resume: Re-enable functionality
      _suspended = false
      debug?.('createSvcWorker: circuit breaker resumed')

      // Send success response (SvcWorkerSessionGenericResponse format)
      const response = createSvcWorkerSessionResumeResponse<SvcWorkerSessionResumeResult>(
        message.id,
        true,
        {
          data: {}
        }
      )
      safePostMessage(port, response, { context: 'resume success response' })
    } catch (error) {
      console.error('createSvcWorker: resume operation failed', error)

      // Send error response
      const response = createSvcWorkerSessionResumeResponse<SvcWorkerSessionResumeResult>(
        message.id,
        false,
        {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      )
      safePostMessage(port, response, { context: 'resume error response' })
    }
  }

  // Handle session port messages
  function createSessionPortHandler(clientId: string, port: MessagePort) {
    return function handleSessionMessage(event: MessageEvent<SvcWorkerSessionMessage>) {
      const data = event.data

      if (!data || typeof data !== 'object' || !('type' in data)) {
        return
      }

      debug?.('createSvcWorker: session message from', clientId, data.type)

      switch (data.type) {
        case V_SW_SESSION_CLOSE: {
          debug?.('createSvcWorker: session close from', clientId)
          try {
            port.close()
          } catch (error) {
            console.error('createSvcWorker: port.close() failed', clientId, error)
          }
          sessions.delete(clientId)
          break
        }

        case V_SW_SESSION_PONG: {
          const session = sessions.get(clientId)
          if (session) {
            session.lastPong = Date.now()
            debug?.('createSvcWorker: PONG received from', clientId)
          }
          break
        }

        case V_SW_SESSION_CIRCUIT_BREAKER: {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises -- Intentional
          handleCircuitBreaker(data, port)
          break
        }

        case V_SW_SESSION_RESUME: {
          handleResume(data, port)
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
          cleanupSession(session, clientId, sessions)
          continue
        }

        // Send PING
        const pingId = crypto.randomUUID()
        debug?.('createSvcWorker: sending PING to', clientId, pingId)
        const sent = safePostMessage(session.port, createSvcWorkerSessionPingMessage(pingId), {
          context: `PING to ${clientId}`,
          onError: () => cleanupSession(session, clientId, sessions)
        })
        if (!sent) {
          continue
        }
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
        cleanupSession(session, clientId, sessions)
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
        case V_SW_VERSION: {
          const port = event.ports?.[0]
          if (port) {
            debug?.('createSvcWorker: responding with version', version)
            safePostMessage(port, createSvcWorkerVersionResponse(version), {
              context: 'version response'
            })
          }
          break
        }

        case V_SW_SKIP_WAITING: {
          debug?.('createSvcWorker: executing skipWaiting')
          self.skipWaiting().catch(error => {
            console.error('createSvcWorker: skipWaiting failed', error)
          })
          break
        }

        case V_SW_CLAIM_CLIENTS: {
          debug?.('createSvcWorker: executing clients.claim()')
          self.clients.claim().catch(error => {
            console.error('createSvcWorker: clients.claim() failed', error)
          })
          break
        }

        case V_SW_SESSION_INIT: {
          const port = event.ports?.[0]
          const clientId = (event.source as Client | null)?.id

          if (!port || !clientId) {
            debug?.('createSvcWorker: SESSION_INIT missing port or clientId')
            break
          }

          debug?.('createSvcWorker: SESSION_INIT from', clientId)

          try {
            // Cleanup any existing session for this client
            const existingSession = sessions.get(clientId)
            if (existingSession) {
              existingSession.port.close()
            }

            // Setup new session
            const messageHandler = createSessionPortHandler(clientId, port)
            const messageErrorHandler = (event: MessageEvent) => {
              console.error('createSvcWorker: messageerror on session port', clientId, event)
            }
            port.addEventListener('message', messageHandler)
            port.addEventListener('messageerror', messageErrorHandler)
            port.start()

            sessions.set(clientId, {
              port,
              lastPong: Date.now(),
              messageHandler,
              messageErrorHandler
            })

            // Start heartbeat if not already running
            startHeartbeat()

            // Cleanup stale sessions on new connection
            // eslint-disable-next-line @typescript-eslint/no-floating-promises -- Intentional
            cleanupStaleSessions()

            // Send init response with suspended status for state recovery after page reload
            const initSent = safePostMessage(
              port,
              createSvcWorkerSessionInitResponse(true, version, _suspended),
              {
                context: `init response to ${clientId}`,
                onError: () => {
                  const session = sessions.get(clientId)
                  if (session) {
                    cleanupSession(session, clientId, sessions)
                  }
                }
              }
            )
            if (!initSent) {
              debug?.('createSvcWorker: failed to send init response, session cleaned up', clientId)
            }
          } catch (error) {
            console.error('createSvcWorker: SESSION_INIT setup failed', clientId, error)
            // Cleanup session if it was partially set up
            const session = sessions.get(clientId)
            if (session) {
              cleanupSession(session, clientId, sessions)
            }
          }
          break
        }

        default: {
          // Unknown message type; ignore
          // console.warn('createSvcWorker: unknown message type received:', data)
          break
        }
      }
    }

    function handleMessageError(event: MessageEvent) {
      console.error('createSvcWorker: messageerror on main handler', event)
    }

    self.addEventListener('message', handleMessage)
    self.addEventListener('messageerror', handleMessageError)
    return () => {
      self.removeEventListener('message', handleMessage)
      self.removeEventListener('messageerror', handleMessageError)
    }
  }
  const stopMessageHandler = registerMessageHandler()

  function cleanup() {
    stopHeartbeat()
    stopMessageHandler()

    // Close all sessions
    for (const [clientId, session] of sessions) {
      debug?.('createSvcWorker: closing session', clientId)
      cleanupSession(session, clientId, sessions)
    }
    sessions.clear()
  }

  function dispose() {
    debug?.('createSvcWorker: disposing')
    cleanup()
  }

  // Extension properties and methods
  const extensions: Record<string | symbol, unknown> = {
    get version() {
      return version
    },
    get sessionCount() {
      return sessions.size
    },
    get suspended() {
      return _suspended
    },
    dispose,
    [Symbol.dispose]: dispose
  }

  // Create Proxy for transparent access to native APIs
  return new Proxy(self, {
    get(target, prop, _receiver) {
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
      // NOTE: Use `target` instead of `receiver` to ensure native getters (like `clients`)
      // are called with the correct `this` context (`ServiceWorkerGlobalScope`)
      const value = Reflect.get(target, prop, target) // eslint-disable-line @typescript-eslint/no-unsafe-assignment -- for generic
      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(target)
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- for generic
      return value
    },

    set(target, prop, value, receiver) {
      // Readonly extension properties
      if (prop === 'version' || prop === 'sessionCount' || prop === 'suspended') {
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
