/**
 * Service Worker Session Module
 *
 * Provides a persistent MessageChannel-based session for communication
 * between the page and an active Service Worker.
 *
 * @module session
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import {
  createSvcWorkerSessionCloseMessage,
  isSvcWorkerSessionPingMessage,
  isSvcWorkerSessionGenericResponse,
  isSvcWorkerSessionInitResponse,
  isSvcWorkerSessionTerminatedMessage,
  createSvcWorkerSessionInitMessage,
  createSvcWorkerSessionPongMessage
} from './protocols.ts'
import { abortError } from '@kazupon/jts-utils/abort'

import type {
  SvcWorkerSessionInitResponse,
  SvcWorkerSessionMessage,
  SvcWorkerMessageBase,
  SvcWorkerTerminatedReason
} from './protocols.ts'

/**
 * Session Error.
 */
export class SvcWorkerSessionError extends Error {
  name = 'SvcWorkerSessionError'
  constructor(message: string, cause?: Error) {
    super(message, { cause })
  }
}

/**
 * Options for creating a session.
 */
export interface SvcWorkerSessionOptions {
  /**
   * AbortSignal for cancelling session initialization
   */
  signal?: AbortSignal
  /**
   * Debug logger function
   */
  debug?: Console['debug']
}

/**
 * Service Worker Session interface.
 *
 * Provides a persistent connection to an active Service Worker
 * with send/response capabilities.
 */
export interface SvcWorkerSession extends Disposable {
  /**
   * Whether the session is currently connected.
   */
  readonly connected: boolean
  /**
   * The version of the connected Service Worker.
   */
  readonly version: string
  /**
   * Whether the Service Worker was in suspended state when the session was established.
   * This is used to detect if a page reload occurred while the service worker was suspended.
   */
  readonly suspended: boolean
  /**
   * Send a message through the session port and wait for response.
   *
   * An 'id' field will be auto-generated if not present, used for response matching.
   * The service worker should respond with a message containing the same 'id'.
   *
   * @param message - The message to send (must have 'type' field)
   * @param options - Request options
   * @returns Promise resolving to the response data
   * @throws {SvcWorkerSessionError} If the session is not connected or the request fails
   * @throws {DOMException} If the request is aborted
   *
   * @example
   * ```ts
   * const result = await session.send<CircuitBreakerResult>({
   *   type: V_SW_SESSION_CIRCUIT_BREAKER,
   *   mode: 'suspend'
   * })
   * ```
   */
  send<T>(
    message: SvcWorkerMessageBase & Record<string, unknown>,
    options?: {
      signal?: AbortSignal
    }
  ): Promise<T>
  /**
   * Close the session.
   *
   * @throws {SvcWorkerSessionError} If an error occurs while closing the session
   */
  close(): void
  /**
   * Register a callback to be called when the service worker is terminated.
   *
   * This is triggered when the service worker sends a V_SW_SESSION_TERMINATED
   * message, typically when it has unregistered itself via circuit breaker.
   *
   * @param callback - The callback to invoke when terminated, receives the reason
   */
  onTerminated(callback: (reason: SvcWorkerTerminatedReason) => void): void
}

/**
 * Create a session with an active Service Worker.
 *
 * @param serviceWorker - The active Service Worker to connect to
 * @param options - Session options
 * @returns Promise resolving to the established session
 *
 * @example
 * ```ts
 * const session = await createSession(navigator.serviceWorker.controller)
 * console.log('Connected to SW version:', session.version)
 *
 * session.close()
 * ```
 */
export async function createSession(
  serviceWorker: ServiceWorker,
  options: SvcWorkerSessionOptions = {}
): Promise<Readonly<SvcWorkerSession>> {
  const { signal, debug } = options

  // Check if already aborted
  if (signal?.aborted) {
    throw new SvcWorkerSessionError('Session initialization aborted')
  }

  debug?.('createSession: initiating session with service worker')

  // Create MessageChannel for session
  const channel = new MessageChannel()
  const port = channel.port1

  // Track pending requests
  const pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
    }
  >()

  let _connected = false
  let _version = ''
  let _suspended = false
  let _onTerminatedCallback: ((reason: SvcWorkerTerminatedReason) => void) | null = null

  // Handle incoming messages on the session port
  function handleMessage(event: MessageEvent<SvcWorkerSessionMessage>) {
    const data = event.data
    if (!data || typeof data !== 'object') {
      return
    }

    // Handle PING messages
    if (isSvcWorkerSessionPingMessage(data)) {
      debug?.('createSession: received PING, sending PONG', data.id)
      port.postMessage(createSvcWorkerSessionPongMessage(data.id))
      return
    }

    // Handle TERMINATED notification
    if (isSvcWorkerSessionTerminatedMessage(data)) {
      debug?.('createSession: received TERMINATED notification, reason:', data.reason)
      _onTerminatedCallback?.(data.reason)
      return
    }

    // Handle any response with id + success fields (generic response handling)
    // This handles dedicated protocol responses (CIRCUIT_BREAKER, RESUME, etc.)
    if (isSvcWorkerSessionGenericResponse(data)) {
      const pending = pendingRequests.get(data.id)
      if (pending) {
        pendingRequests.delete(data.id)
        if (data.success) {
          pending.resolve(data.data)
        } else {
          pending.reject(new SvcWorkerSessionError(data.error ?? 'Request failed'))
        }
      }
    }
  }
  port.addEventListener('message', handleMessage)

  function handleMessageError(event: MessageEvent) {
    console.error('session: message error on session port', event)
  }
  port.addEventListener('messageerror', handleMessageError)

  port.start()

  // Initialize session
  return new Promise<Readonly<SvcWorkerSession>>((resolve, reject) => {
    function cleanup() {
      signal?.removeEventListener('abort', onAbort)
      port.removeEventListener('message', handleInitResponse)
      port.removeEventListener('message', handleMessage)
      port.removeEventListener('messageerror', handleMessageError)
      port.close()
    }

    function onAbort() {
      cleanup()
      reject(new SvcWorkerSessionError('Session initialization aborted'))
    }

    // Setup abort handler
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true })
    }

    // Listen for init response
    function handleInitResponse(event: MessageEvent<SvcWorkerSessionInitResponse>) {
      const data = event.data
      if (isSvcWorkerSessionInitResponse(data)) {
        signal?.removeEventListener('abort', onAbort)
        port.removeEventListener('message', handleInitResponse)

        if (data.success) {
          _connected = true
          _version = data.version
          _suspended = data.suspended ?? false
          debug?.(
            'createSession: session established, version:',
            _version,
            'suspended:',
            _suspended
          )
          resolve(_createSession())
        } else {
          port.removeEventListener('message', handleMessage)
          port.removeEventListener('messageerror', handleMessageError)
          port.close()
          reject(new SvcWorkerSessionError('Session initialization failed'))
        }
      }
    }
    port.addEventListener('message', handleInitResponse)

    // Send init message with port
    serviceWorker.postMessage(createSvcWorkerSessionInitMessage(), [channel.port2])
  })

  function _createSession(): Readonly<SvcWorkerSession> {
    function send<T>(
      message: SvcWorkerMessageBase & Record<string, unknown>,
      sendOptions: { signal?: AbortSignal } = {}
    ): Promise<T> {
      if (!_connected) {
        return Promise.reject(new SvcWorkerSessionError('Session not connected'))
      }

      const { signal } = sendOptions
      // Auto-generate id if not present
      const id = (message as { id?: string }).id ?? crypto.randomUUID()
      const messageWithId = { ...message, id }

      // Check if already aborted
      if (signal?.aborted) {
        return Promise.reject(abortError(signal, { message: 'Request aborted' }) as DOMException)
      }

      return new Promise<T>((resolveSend, rejectSend) => {
        function onAbort() {
          pendingRequests.delete(id)
          rejectSend(new SvcWorkerSessionError('Request aborted'))
        }

        // Handle abort signal
        if (signal) {
          signal.addEventListener('abort', onAbort, { once: true })
        }

        pendingRequests.set(id, {
          resolve: (value: unknown) => {
            signal?.removeEventListener('abort', onAbort)
            resolveSend(value as T)
          },
          reject: (error: Error) => {
            signal?.removeEventListener('abort', onAbort)
            rejectSend(error)
          }
        })

        debug?.('createSession: sending message', message.type, id)
        port.postMessage(messageWithId)
      })
    }

    function close() {
      if (!_connected) {
        return
      }

      debug?.('createSession: closing session')

      // Send close message
      port.postMessage(createSvcWorkerSessionCloseMessage())

      // Reject all pending requests
      for (const [id, pending] of pendingRequests) {
        pending.reject(new SvcWorkerSessionError('Session closed'))
        pendingRequests.delete(id)
      }

      // Cleanup
      port.removeEventListener('message', handleMessage)
      port.removeEventListener('messageerror', handleMessageError)
      port.close()
      _connected = false
    }

    function onTerminated(callback: (reason: SvcWorkerTerminatedReason) => void) {
      _onTerminatedCallback = callback
    }

    return Object.freeze({
      get connected() {
        return _connected
      },
      get version() {
        return _version
      },
      get suspended() {
        return _suspended
      },
      send,
      close,
      onTerminated,
      [Symbol.dispose]() {
        close()
      }
    })
  }
}
