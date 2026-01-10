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

import { VROWSER_SW_SKIP_WAITING, VROWSER_SW_VERSION } from './protocols.ts'

import type { SvcWorkerMessage } from './protocols.ts'

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
 * Service Worker options for {@link createSvcWorker}
 */
export interface SvcWorkerOptions {
  /**
   * The version of this service worker
   * This is used to identify the service worker when communicating with {@link SvcWorkerController}
   */
  version: string

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
): Readonly<SvcWorker> {
  const { version, debug } = options

  debug?.('createSvcWorker: initializing with version', version)

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
            port.postMessage({ version })
          }
          break
        }

        case VROWSER_SW_SKIP_WAITING: {
          debug?.('createSvcWorker: executing skipWaiting')
          // eslint-disable-next-line @typescript-eslint/no-floating-promises -- Intentional
          self.skipWaiting()
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
    stopMessageHandler()
  }

  function dispose() {
    debug?.('createSvcWorker: disposing')
    cleanup()
  }

  // Extension properties and methods
  const extensions: Record<string | symbol, unknown> = Object.freeze({
    version,
    dispose,
    [Symbol.dispose]: dispose
  })

  // Create Proxy for transparent access to native APIs
  return new Proxy(self, {
    get(target, prop, receiver) {
      // Check extension properties first
      if (prop in extensions) {
        const value = extensions[prop]
        if (typeof value === 'function') {
          return (value as (...args: unknown[]) => unknown).bind(extensions)
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
      if (prop === 'version') {
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
