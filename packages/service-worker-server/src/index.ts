/**
 * This entry file is for service worker server
 *
 * @module service-worker-server
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { EventEmitter } from 'events'
import { createSvcWorker } from '@vrowser/service-worker/worker'

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
}

/**
 * Default timeout for waiting for the activate event (30 seconds)
 */
const DEFAULT_ACTIVATE_TIMEOUT = 30000

/**
 * The Server for service worker environment
 *
 * This class have like Node.js HTTP Server interfaces.
 * This class will be used as server that runs within a Service Worker environment.
 */
export class SvcWorkerServer extends EventEmitter implements Disposable, AsyncDisposable {
  #svcWorker: SvcWorker
  #options: SvcWorkerServerOptions
  #listening: boolean = false
  #fetchHandler: ((event: FetchEvent) => void) | null = null
  #boundFetchHandler: ((event: FetchEvent) => void) | null = null
  #activateHandler: ((event: ExtendableEvent) => void) | null = null
  #activateTimeoutId: ReturnType<typeof setTimeout> | null = null

  constructor(self: ServiceWorkerGlobalScope, options: SvcWorkerServerOptions) {
    validServiceWorkerState(self)
    super()
    this.#options = options
    this.#svcWorker = createSvcWorker(self, options)
  }

  get state(): SvcWorkerServerState {
    // TODO:
    return 'installing'
  }

  /**
   * Start a server listening for service worker fetch events
   *
   * When the service worker fetch event handler is bound, the 'listening' event will be emitted.
   * And server will be started to accept {@link MessageChannel} port via `message` events from clients.
   *
   * @param handler - A fetch event handler
   * @param options - Options for listening
   * @returns The server instance
   */
  listen(handler: (event: FetchEvent) => void, options?: ListenOptions): this {
    // Prevent double listen
    if (this.#listening) {
      queueMicrotask(() =>
        this.emit('error', new SvcWorkerServerError('Server is already listening'))
      )
      return this
    }

    // Validate fetch handler
    if (typeof handler !== 'function') {
      queueMicrotask(() =>
        this.emit('error', new SvcWorkerServerError('fetch handler must be a function'))
      )
      return this
    }

    // Resolve options
    const activateTimeout = options?.activateTimeout ?? DEFAULT_ACTIVATE_TIMEOUT

    // Store handler
    this.#fetchHandler = handler

    // Create wrapper with suspended/closed check
    this.#boundFetchHandler = (event: FetchEvent) => {
      if (this.#svcWorker.suspended || !this.#listening) {
        return // Fall through to network
      }
      try {
        this.#fetchHandler!(event)
      } catch (err) {
        this.emit('error', err)
      }
    }

    // Update state
    this.#listening = true

    // Check activated state
    const sw = this.#svcWorker as unknown as ServiceWorkerGlobalScope
    const isActivated = sw.registration.active !== null

    if (isActivated) {
      // Already activated -> register fetch listener and emit 'listening' immediately (async)
      this.#svcWorker.addEventListener('fetch', this.#boundFetchHandler)
      queueMicrotask(() => {
        if (this.#listening) {
          this.emit('listening')
        }
      })
    } else {
      // Not activated -> wait for activate event with timeout

      // Set timeout
      this.#activateTimeoutId = setTimeout(() => {
        this.#cleanupActivateWaiting()
        if (this.#listening) {
          this.#listening = false
          this.#fetchHandler = null
          this.#boundFetchHandler = null
          this.emit(
            'error',
            new SvcWorkerServerError(
              `Activate timeout: Service Worker did not activate within ${activateTimeout}ms`
            )
          )
        }
      }, activateTimeout)

      // Set activate handler
      this.#activateHandler = (event: ExtendableEvent) => {
        // Cleanup timeout and handler
        this.#cleanupActivateWaiting()

        // Call `clients.claim()` if `claimOnActivate` is true
        if (this.#options.claimOnActivate) {
          const serviceWorkerScope = this.#svcWorker as unknown as ServiceWorkerGlobalScope
          event.waitUntil(serviceWorkerScope.clients.claim())
        }

        // Register fetch listener after activation
        if (this.#listening && this.#boundFetchHandler) {
          this.#svcWorker.addEventListener('fetch', this.#boundFetchHandler)
          this.emit('listening')
        }
      }
      this.#svcWorker.addEventListener('activate', this.#activateHandler)
    }

    return this
  }

  /**
   * Cleanup activate waiting state (timeout and handler)
   */
  #cleanupActivateWaiting(): void {
    if (this.#activateTimeoutId !== null) {
      clearTimeout(this.#activateTimeoutId)
      this.#activateTimeoutId = null
    }
    if (this.#activateHandler) {
      this.#svcWorker.removeEventListener('activate', this.#activateHandler)
      this.#activateHandler = null
    }
  }

  /**
   * Stops the server from accepting new fetch event and keeps existing {@link MessageChannel} port connections
   *
   * When it will be finished, the optional callback `fn` will be called, and trigger 'close' event.
   *
   * @param cb - An optional callback function which will be called when the server is closed
   * @returns The server instance
   */
  close(cb?: (err?: Error) => void): this {
    // Emit callback and 'close' event even if not listening
    if (!this.#listening) {
      queueMicrotask(() => {
        cb?.()
        this.emit('close')
      })
      return this
    }

    // Cleanup activate waiting state (timeout and handler)
    this.#cleanupActivateWaiting()

    // Remove fetch event listener
    if (this.#boundFetchHandler) {
      this.#svcWorker.removeEventListener('fetch', this.#boundFetchHandler)
      this.#boundFetchHandler = null
    }

    // Clear handler reference
    this.#fetchHandler = null

    // Update state
    this.#listening = false

    // Emit callback and 'close' event (async)
    // NOTE: MessageChannel sessions are not closed (as per requirements)
    queueMicrotask(() => {
      cb?.()
      this.emit('close')
    })

    return this
  }

  /**
   * Returns the bound service worker address
   *
   * the address service worker script URL, or `null` if the server is not listening.
   *
   * @returns The service worker script URL or `null`
   */
  address(): URL | null {
    // TODO: implement
    return null
  }

  /**
   * Asynchronously get the number of concurrent {@link MessageChannel} port connections on the server.
   */
  getConnections(cb: (error: Error | null, count: number) => void): this {
    // TODO: implement
    cb(null, 0)
    return this
  }

  /**
   * Closes all {@link MessageChannel} port connections connected to this server.
   */
  closeAllConnections(): void {
    // TODO: implement
  }

  /**
   * Closes all {@link MessageChannel} port connections connected to this server which are not sending a request
   * or waiting for a response.
   */
  closeIdleConnections(): void {
    // TODO: implement
  }

  [Symbol.dispose](): void {
    this.close()
  }

  /**
   * Calls close() and returns a promise that fulfills when the server has closed.
   */
  async [Symbol.asyncDispose](): Promise<void> {
    return new Promise((resolve, reject) => {
      this.close(err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}

function validServiceWorkerState(self: ServiceWorkerGlobalScope): void {
  if (self.registration.installing) {
    throw new SvcWorkerServerError('Service worker is still installing.')
  }
  if (self.registration.waiting) {
    throw new SvcWorkerServerError('Service worker is waiting to activate.')
  }
  if (self.registration.active) {
    throw new SvcWorkerServerError('Service worker is already active.')
  }
}
