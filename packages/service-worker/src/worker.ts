/**
 * Service Worker module
 *
 * > [!IMPORTANT]
 * > This module is intended for use within service workers.
 * > It cannot be used in regular JavaScript applications.
 *
 * @module service-worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { createEmitter } from '@kazupon/jts-utils'

import type { Emittable } from '@kazupon/jts-utils'

/**
 * Service Worker options interface for {@link createSvcWorker}
 */
export interface SvcWorkerOptions {
  /**
   * debug logger function
   */
  debug?: Console['debug']
}

/**
 * Service worker interface, which can be wrapped around native Service worker global scope
 */
export interface SvcWorker extends Emittable {
  /**
   * Ready promise that activates when the service worker is prepared
   */
  ready(): Promise<boolean>
}

/**
 * Create a Service Worker
 *
 * @param self - An {@link ServiceWorkerGlobalScope | Service worker global scope}
 * @param options - An {@link SvcWorkerOptions | Service worker options}
 * @returns - {@link SvcWorker | Service worker instance}
 */
export function createSvcWorker(
  self: ServiceWorkerGlobalScope,
  options?: SvcWorkerOptions
): Readonly<SvcWorker> {
  const _emitter = createEmitter()

  // TODO:

  return Object.freeze({}) as SvcWorker
}
