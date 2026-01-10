/**
 * Service Worker Module
 *
 * > [!IMPORTANT]
 * > This module is intended for use within service workers.
 * > It cannot be used in regular JavaScript applications.
 *
 * This module essentially acts as a wrapper for Service Workers,
 * but internally `@vrowser/service-worker` establishes a dedicated session using {@link SvcWorkerController} and `MessageChannel` to provide functionality.
 *
 * ## Features
 * - heatbeat: `VROWSER_SW_PING`
 * - Service Worker version management: `VROWSER_SW_VERSION`
 * - Optional execution of skipWaiting: `VROWSER_SW_SKIP_WAITING`
 * - Kill switch: `VROWSER_SW_KILL_SWITCH`
 *
 * @module worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { Emittable } from '@kazupon/jts-utils'
import type { AbortableOptions } from './types.ts'

/**
 * Service Worker Error
 */
export class SvcWorkerError extends Error {
  name = 'ServiceWorkerError'
  constructor(message: string, cause?: Error) {
    super(message, { cause })
  }
}

/**
 * Service Worker options for {@link createSvcWorker}
 */
export interface SvcWorkerOptions {
  /**
   * debug logger function
   */
  debug?: Console['debug']
}

/**
 * {@link SvcWorker.ready | Service Worker ready} options
 */
export interface SvcWorkerReadyOptions extends AbortableOptions {
  /**
   * Whether to skip waiting for `self.skipWaiting()` to be called on the service worker side after installation
   *
   * @default true
   */
  skipWaiting?: boolean
}

/**
 * Service worker wrapped by [ServiceWorkerGlobalScope](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope)
 */
export interface SvcWorker extends Emittable<{
  [K in keyof ServiceWorkerGlobalScopeEventMap]: ServiceWorkerGlobalScopeEventMap[K]
}> {
  /**
   * Ready promise that activates when the service worker is prepared
   *
   * @param options - A {@link SvcWorkerReadyOptions | Service Worker ready options}
   * @throws {SvcWorkerError} When the service worker will not be achieved to activated
   * @throws {DOMException} When the operation is aborted
   */
  ready(options?: SvcWorkerReadyOptions): Promise<void>
}

/**
 * Create a Service worker
 *
 * @param self - A {@link ServiceWorkerGlobalScope | Service worker global scope}
 * @param options - A {@link SvcWorkerOptions | Service worker options}
 * @returns - {@link SvcWorker | Service worker instance}
 */
export function createSvcWorker(
  _self: ServiceWorkerGlobalScope,
  _options?: SvcWorkerOptions
): Readonly<SvcWorker> {
  // TODO: Implement SvcWorker

  return Object.freeze({}) as SvcWorker
}
