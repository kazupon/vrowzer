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
  createSvcWorkerSessionRequest,
  createSvcWorkerSessionCloseMessage,
  isSvcWorkerSessionRequestResponse,
  isSvcWorkerSessionPingMessage,
  isSvcWorkerSessionInitResponse,
  createSvcWorkerSessionInitMessage,
  createSvcWorkerSessionPongMessage
} from './protocols.ts'
import { abortError } from '@kazupon/jts-utils/abort'

import type { SvcWorkerSessionInitResponse, SvcWorkerSessionMessage } from './protocols.ts'

/**
 * Session Error
 */
export class SvcWorkerSessionError extends Error {
  name = 'SvcWorkerSessionError'
  constructor(message: string, cause?: Error) {
    super(message, { cause })
  }
}

/**
 * Options for creating a session
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
 * Service Worker Session interface
 *
 * Provides a persistent connection to an active Service Worker
 * with request/response capabilities.
 */
export interface SvcWorkerSession extends Disposable {
  /**
   * Whether the session is currently connected
   */
  readonly connected: boolean
  /**
   * The version of the connected Service Worker
   */
  readonly version: string
  /**
   * Send a request to the Service Worker and wait for a response
   *
   * @param type - The message type
   * @param payload - Optional payload data
   * @param options - Request options
   * @returns Promise resolving to the response data
   * @throws {SvcWorkerSessionError} If the session is not connected or the request fails
   * @throws {DOMException} If the request is aborted
   */
  request<T>(
    type: string,
    payload?: unknown,
    options?: {
      signal?: AbortSignal
    }
  ): Promise<T>
  /**
   * Close the session
   *
   * @throws {SvcWorkerSessionError} If an error occurs while closing the session
   */
  close(): void
}

/**
 * Create a session with an active Service Worker
 *
 * @param serviceWorker - The active Service Worker to connect to
 * @param options - Session options
 * @returns Promise resolving to the established session
 *
 * @example
 * ```typescript
 * const session = await createSession(navigator.serviceWorker.controller)
 * console.log('Connected to SW version:', session.version)
 *
 * const result = await session.request('CUSTOM_REQUEST', { data: 'test' })
 * console.log('Response:', result)
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

    // Handle responses
    if (isSvcWorkerSessionRequestResponse(data)) {
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
          debug?.('createSession: session established, version:', _version)
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
    function request<T>(
      type: string,
      payload?: unknown,
      requestOptions: { signal?: AbortSignal } = {}
    ): Promise<T> {
      if (!_connected) {
        return Promise.reject(new SvcWorkerSessionError('Session not connected'))
      }

      const { signal } = requestOptions
      const id = crypto.randomUUID()

      // Check if already aborted
      if (signal?.aborted) {
        return Promise.reject(abortError(signal, { message: 'Request aborted' }) as DOMException)
      }

      return new Promise<T>((resolveRequest, rejectRequest) => {
        function onAbort() {
          pendingRequests.delete(id)
          rejectRequest(new SvcWorkerSessionError('Request aborted'))
        }

        // Handle abort signal
        if (signal) {
          signal.addEventListener('abort', onAbort, { once: true })
        }

        pendingRequests.set(id, {
          resolve: (value: unknown) => {
            signal?.removeEventListener('abort', onAbort)
            resolveRequest(value as T)
          },
          reject: (error: Error) => {
            signal?.removeEventListener('abort', onAbort)
            rejectRequest(error)
          }
        })

        debug?.('createSession: sending request', type, id)
        port.postMessage(createSvcWorkerSessionRequest(type, id, payload))
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

    return Object.freeze({
      get connected() {
        return _connected
      },
      get version() {
        return _version
      },
      request,
      close,
      [Symbol.dispose]() {
        close()
      }
    })
  }
}
