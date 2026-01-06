/**
 * Service Worker Controller
 *
 * @module service-worker-controller
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { createEmitter } from '@kazupon/jts-utils'

import type { Emittable } from '@kazupon/jts-utils'

/**
 * Service worker registration options for {@link createSvcWorkerController}
 */
export interface SvcWorkerControllerOptions extends RegistrationOptions {
  /**
   * The URL of the service worker script to register
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register
   */
  scriptURL: string | URL
  /**
   * debug logger function
   */
  debug?: Console['debug']
}

/**
 * Service worker controller interface
 *
 * This interface can be controlled service worker lifecycle with `navigator.serviceWorker` or `ServiceWorkerRegistration` API.
 */
export interface SvceWorkerController extends Emittable {
  /**
   * Ready for the service worker
   *
   * waits for the service worker will be achieved to activated and return `true` promise.
   * if the service worker will not be achieved to activated, returns `false` promise.
   *
   * @param claim - whether to wait for `clients.claim()` to be called on the service worker side after activation, default is `false`
   */
  ready(claim?: boolean): Promise<boolean>
  /**
   * Shutdown the service worker
   *
   * waits for the service worker will be achieved to unregister and return `true` promise.
   * if the service worker will not be achieved to unregister, returns `false` promise.
   */
  shutdown(): Promise<boolean>
}

/**
 * Create a Service worker controller instance
 *
 * @param options {@link SvcWorkerControllerOptions | Service worker controller options}
 * @returns - {@link SvceWorkerController | Service worker controller instance}
 */
export function createSvcWorkerController(
  options: SvcWorkerControllerOptions
): Readonly<SvceWorkerController> {
  const _debug = options.debug
  const _emitter = createEmitter()
  const _registration: ServiceWorkerRegistration | null = null

  _debug?.('Creating Service Worker with options:', options)

  return Object.freeze({}) as Readonly<SvceWorkerController>
}
