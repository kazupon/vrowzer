/**
 * This entry file is for service worker server
 *
 * @module service-worker-server
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { Emitter } from '@kazupon/jts-utils/event'
import { createSvcWorker } from '@vrowser/service-worker/worker'

import type { Emittable } from '@kazupon/jts-utils/event/emitter'
import type { SvcWorker, SvcWorkerOptions } from '@vrowser/service-worker/worker'

/**
 * Service worker server error
 */
export class SvcWorkerServerError extends Error {
  name = 'SvcWorkerServerError'
  constructor(message: string, cause?: Error) {
    super(message, { cause })
  }
}

/**
 * The {@link SvcWorkerServer} constructor options
 */
export interface SvcWorkerServerOptions extends SvcWorkerOptions {
  /**
   * Automatically call `clients.claim()` on `activate` event.
   */
  claimOnActivate?: boolean
}

/**
 * Extend {@link ServiceWorkerState} with additional states
 *
 * - 'suspended': State when {@link SvcWorker | service worker} is suspended.
 */
export type SvcWorkerServerState = ServiceWorkerState | 'suspended'

/**
 * Options for the {@link SvcWorkerServer.listen} method
 */
export interface ListenOptions {
  /**
   * Timeout in milliseconds for waiting for the activate event.
   * If the timeout is exceeded, an 'error' event is emitted.
   * @default 30000 (30 seconds)
   */
  activateTimeout?: number
  /**
   * Enable listening for MessageChannel port connections.
   * If set to true, the server will accept connections via `message` events from clients.
   * @default false
   */
  enableListenConnections?: boolean
}

/**
 * Connection event payload for {@link MessageChannel} connections.
 *
 * This interface represents a connection event that is emitted when a client
 * sends a message with {@link MessagePort | MessagePorts} (typically for establishing a MessageChannel connection).
 *
 * @typeParam T - The type of the message data. Defaults to `unknown`.
 *
 * @example
 * ```ts
 * interface MyMessage {
 *   type: 'greeting' | 'farewell'
 *   payload: string
 * }
 *
 * const server = createSvcWorkerServer<MyMessage>(self, options)
 * server.on('connection', (event) => {
 *   // event.data is typed as MyMessage
 *   console.log(event.data.type, event.data.payload)
 *   // Access the MessagePorts
 *   console.log(event.ports)
 * })
 * ```
 */
export interface ConnectionEvent<T = unknown> {
  /**
   * The MessagePorts received from the client.
   */
  readonly ports: readonly MessagePort[]
  /**
   * The source of the message (Client, ServiceWorker, or MessagePort).
   */
  readonly source: Client | ServiceWorker | MessagePort | null
  /**
   * The message data with type safety.
   */
  readonly data: T
  /**
   * The client ID if the source is a Client.
   */
  readonly clientId?: string
}

/**
 * Event map for {@link SvcWorkerServer}.
 *
 * This type defines the payload types for each event.
 *
 * @typeParam MessageData - The type of the message data for the `connection` event. Defaults to `unknown`.
 */
export type SvcWorkerServerEventMap<MessageData = unknown> = {
  /**
   * Emitted when the server starts listening for fetch events.
   */
  listening: void
  /**
   * Emitted when a client connects via MessageChannel.
   * This event is fired only when the message contains MessagePorts.
   */
  connection: ConnectionEvent<MessageData>
  /**
   * Emitted when the server is closed.
   */
  close: void
  /**
   * Emitted when an error occurs.
   */
  error: Error
}

/**
 * Default timeout for waiting for the activate event (30 seconds)
 */
const DEFAULT_ACTIVATE_TIMEOUT = 30000

/**
 * The Server for service worker environment
 *
 * This interface has like Node.js HTTP Server interfaces.
 * This will be used as server that runs within a Service Worker environment.
 *
 * @typeParam MessageData - The type of the message data for the `connection` event. Defaults to `unknown`.
 */
export interface SvcWorkerServer<MessageData = unknown>
  extends Emittable<SvcWorkerServerEventMap<MessageData>>, Disposable, AsyncDisposable {
  /**
   * The current state of the server
   */
  readonly state: SvcWorkerServerState

  /**
   * Set a fetch event handler
   * @param handler - A function to handle fetch events
   */
  setFetchHandler(handler: (event: FetchEvent) => void): void

  /**
   * Start a server listening for service worker fetch events
   *
   * When the service worker fetch event handler is bound, the 'listening' event will be emitted.
   * If `enableListenConnections` option is set to `true`, server will be started to listen MessageChannel connection too via {@link SvcWorkerServer.listenConnections} internally.
   *
   * @param options - Options for listening
   * @returns The server instance
   * @throws {SvcWorkerServerError} When the server is already listening or fetch handler is not set
   */
  listen(options?: ListenOptions): SvcWorkerServer<MessageData>

  /**
   * Start a MessageChannel port connections listening with `message` events from clients.
   *
   * @returns The server instance
   */
  listenConnections(): SvcWorkerServer<MessageData>

  /**
   * Stops the server from accepting new fetch event and close {@link MessageChannel} port connections
   *
   * When it will be finished, the optional callback `fn` will be called, and trigger 'close' event.
   *
   * @param cb - An optional callback function which will be called when the server is closed
   * @param stopConnectionListening - If `true`, also stops listening for MessageChannel port connections too via {@link SvcWorkerServer.closeConnections}. Defaults to `false`.
   * @returns The server instance
   */
  close(cb?: (err?: Error) => void, stopConnectionListening?: boolean): SvcWorkerServer<MessageData>

  /**
   * Closes {@link MessageChannel} port connections connected to this server.
   *
   * @param cb - An optional callback function which will be called when MessageChannel port connections are closed
   * @returns The server instance
   */
  closeConnections(cb?: (err?: Error) => void): SvcWorkerServer<MessageData>

  /**
   * Returns the bound service worker address
   *
   * the address service worker script URL, or `null` if the server is not listening.
   *
   * @returns The service worker script URL or `null`
   */
  address(): URL | null

  /**
   * Asynchronously get the number of concurrent {@link MessageChannel} port connections on the server.
   */
  getConnections(cb: (error: Error | null, count: number) => void): SvcWorkerServer<MessageData>

  /**
   * `Symbol.dispose` for `using` syntax support (TypeScript 5.2+)
   */
  [Symbol.dispose](): void

  /**
   * Calls `close()` and returns a promise that fulfills when the server has closed.
   */
  [Symbol.asyncDispose](): Promise<void>
}

/**
 * Create a {@link SvcWorkerServer | Service worker server} instance.
 *
 * @typeParam MessageData - The type of the message data for the `connection` event. Defaults to `unknown`.
 * @param self - The {@link ServiceWorkerGlobalScope} instance (typically `self` in a service worker)
 * @param options - {@link SvcWorkerServerOptions | Service worker server options}
 * @returns {@link SvcWorkerServer | Service worker server instance}
 *
 * @example
 * ```ts
 * interface MyMessage {
 *   type: 'greeting' | 'farewell'
 *   payload: string
 * }
 *
 * const server = createSvcWorkerServer<MyMessage>(self, { version: '1.0.0' })
 * server.on('connection', (event) => {
 *   // event.data is typed as MyMessage
 *   console.log(event.data.type, event.data.payload)
 *   // Access the MessagePorts
 *   console.log(event.ports)
 *   // Access client ID if available
 *   console.log(event.clientId)
 * })
 * ```
 */
export function createSvcWorkerServer<MessageData = unknown>(
  self: ServiceWorkerGlobalScope,
  options: SvcWorkerServerOptions
): SvcWorkerServer<MessageData> {
  const _emitter = Emitter<SvcWorkerServerEventMap<MessageData>>()
  const _svcWorker: SvcWorker = createSvcWorker(self, options)
  const _options = options

  const _ports: Set<MessagePort> = new Set()

  let _listening = false
  let _listeningConnections = false
  let _fetchHandler: ((event: FetchEvent) => void) | null = null
  let _boundFetchHandler: ((event: FetchEvent) => void) | null = null
  let _activateHandler: ((event: ExtendableEvent) => void) | null = null
  let _activateTimeoutId: ReturnType<typeof setTimeout> | null = null
  let _messageHandler: ((event: ExtendableMessageEvent) => void) | null = null

  /**
   * Cleanup activate waiting state (timeout and handler)
   */
  function cleanupActivateWaiting(): void {
    if (_activateTimeoutId !== null) {
      clearTimeout(_activateTimeoutId)
      _activateTimeoutId = null
    }
    if (_activateHandler) {
      _svcWorker.removeEventListener('activate', _activateHandler)
      _activateHandler = null
    }
  }

  function listenConnections(): SvcWorkerServer<MessageData> {
    // Already listening for connections -> do nothing
    if (_listeningConnections) {
      return instance
    }

    // Register message handler for connection events
    _messageHandler = (event: ExtendableMessageEvent) => {
      // Only emit connection event when ports are present
      if (event.ports && event.ports.length > 0) {
        // Register ports to the Set
        for (const port of event.ports) {
          _ports.add(port)
        }

        const clientId = (event.source as Client | null)?.id
        const connectionEvent: ConnectionEvent<MessageData> = {
          ports: event.ports,
          source: event.source,
          data: event.data as MessageData,
          ...(clientId !== undefined && { clientId })
        }
        _emitter.emit('connection', connectionEvent)
      }
    }
    self.addEventListener('message', _messageHandler)

    _listeningConnections = true

    return instance
  }

  function setFetchHandler(handler: (event: FetchEvent) => void): void {
    if (typeof handler !== 'function') {
      throw new SvcWorkerServerError('fetch handler must be a function')
    }

    // If already registered, remove previous handler first
    if (_boundFetchHandler) {
      _svcWorker.removeEventListener('fetch', _boundFetchHandler)
    }

    // Store user's handler
    _fetchHandler = handler

    // Create wrapper with suspended/listening check
    // This wrapper is registered immediately but only calls user's handler when listening
    _boundFetchHandler = (event: FetchEvent) => {
      // Don't call user's handler if not listening or suspended
      if (!_listening || _svcWorker.suspended) {
        return // Fall through to network
      }
      try {
        _fetchHandler!(event)
      } catch (err) {
        _emitter.emit('error', err as Error)
      }
    }

    // Register fetch handler immediately (required by Service Worker spec)
    // IMPORTANT: Service Workers require fetch event listeners to be added during
    // the initial script execution, not asynchronously during event callbacks.
    _svcWorker.addEventListener('fetch', _boundFetchHandler)
  }

  function listen(listenOptions?: ListenOptions): SvcWorkerServer<MessageData> {
    // Prevent double listen
    if (_listening) {
      queueMicrotask(() =>
        _emitter.emit('error', new SvcWorkerServerError('Server is already listening'))
      )
      return instance
    }

    // Validate fetch handler is set
    if (!_fetchHandler) {
      queueMicrotask(() =>
        _emitter.emit(
          'error',
          new SvcWorkerServerError('Fetch handler not set. Call setFetchHandler() first.')
        )
      )
      return instance
    }

    // Resolve options
    const activateTimeout = listenOptions?.activateTimeout ?? DEFAULT_ACTIVATE_TIMEOUT
    const enableListenConnections = listenOptions?.enableListenConnections ?? false

    // Update state - this enables the fetch handler wrapper to call user's handler
    _listening = true

    // NOTE: addEventListener('fetch') is already registered in setFetchHandler()

    // Register message handler if enableListenConnections is true
    if (enableListenConnections) {
      listenConnections()
    }

    // Check activated state
    const sw = _svcWorker as unknown as ServiceWorkerGlobalScope
    const isActivated = sw.registration.active !== null

    if (isActivated) {
      // Already activated -> emit 'listening' immediately (async)
      queueMicrotask(() => {
        if (_listening) {
          _emitter.emit('listening')
        }
      })
    } else {
      // Not activated -> wait for activate event with timeout

      // Set timeout
      _activateTimeoutId = setTimeout(() => {
        cleanupActivateWaiting()
        if (_listening) {
          _listening = false
          _fetchHandler = null
          _boundFetchHandler = null
          _emitter.emit(
            'error',
            new SvcWorkerServerError(
              `Activate timeout: Service Worker did not activate within ${activateTimeout}ms`
            )
          )
        }
      }, activateTimeout)

      // Set activate handler
      _activateHandler = (event: ExtendableEvent) => {
        // Cleanup timeout and handler
        cleanupActivateWaiting()

        // Call `clients.claim()` if `claimOnActivate` is true
        if (_options.claimOnActivate) {
          const serviceWorkerScope = _svcWorker as unknown as ServiceWorkerGlobalScope
          event.waitUntil(serviceWorkerScope.clients.claim())
        }

        // Emit listening event after activation
        if (_listening) {
          _emitter.emit('listening')
        }
      }
      _svcWorker.addEventListener('activate', _activateHandler)
    }

    return instance
  }

  function closeConnections(cb?: (err?: Error) => void): SvcWorkerServer<MessageData> {
    // Remove message event listener
    if (_messageHandler) {
      self.removeEventListener('message', _messageHandler)
      _messageHandler = null
    }

    // Close all MessagePort connections
    closeAllConnections()

    // Update state
    _listeningConnections = false

    // Emit callback (async)
    queueMicrotask(() => {
      cb?.()
    })

    return instance
  }

  function close(
    cb?: (err?: Error) => void,
    stopConnectionListening?: boolean
  ): SvcWorkerServer<MessageData> {
    // Emit callback and 'close' event even if not listening
    if (!_listening) {
      queueMicrotask(() => {
        cb?.()
        _emitter.emit('close')
      })
      return instance
    }

    // Cleanup activate waiting state (timeout and handler)
    cleanupActivateWaiting()

    // Remove fetch event listener
    if (_boundFetchHandler) {
      _svcWorker.removeEventListener('fetch', _boundFetchHandler)
      _boundFetchHandler = null
    }

    // Stop connection listening if requested (via closeConnections)
    if (stopConnectionListening) {
      closeConnections()
    }

    // Clear handler reference
    _fetchHandler = null

    // Update state
    _listening = false

    // Emit callback and 'close' event (async)
    queueMicrotask(() => {
      cb?.()
      _emitter.emit('close')
    })

    return instance
  }

  function address(): URL | null {
    // TODO: implement
    return null
  }

  function getConnections(
    cb: (error: Error | null, count: number) => void
  ): SvcWorkerServer<MessageData> {
    queueMicrotask(() => cb(null, _ports.size))
    return instance
  }

  function closeAllConnections(): void {
    for (const port of _ports) {
      port.close()
    }
    _ports.clear()
  }

  function dispose(): void {
    close()
  }

  async function asyncDispose(): Promise<void> {
    return new Promise((resolve, reject) => {
      close(err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  const instance: SvcWorkerServer<MessageData> = {
    ..._emitter,
    get state(): SvcWorkerServerState {
      // TODO:
      return 'installing'
    },
    setFetchHandler,
    listen,
    listenConnections,
    close,
    closeConnections,
    address,
    getConnections,
    [Symbol.dispose]: dispose,
    [Symbol.asyncDispose]: asyncDispose
  } as SvcWorkerServer<MessageData>

  return instance
}
