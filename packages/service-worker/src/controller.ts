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

import type { Emittable, Err } from '@kazupon/jts-utils'
import type { AbortableOptions } from './types.ts'

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
 * Service Worker Controller Error
 */
export class SvcWorkerControllerError extends Error {
  name = 'SvcWorkerControllerError'
  constructor(message: string, cause?: Error) {
    super(message, { cause })
  }
}

/**
 * {@link SvcWorkerController.ready | Service Worker Controller ready} options
 */
export interface SvcWorkerControllerReadyOptions extends AbortableOptions {
  /**
   * Whether to wait for `clients.claim()` to be called on the service worker side after activation
   *
   * @default false
   */
  claim?: boolean
}

/**
 * Service worker controller
 *
 * This interface can be controlled service worker lifecycle with `navigator.serviceWorker` or `ServiceWorkerRegistration` API.
 */
export interface SvcWorkerController extends Emittable {
  /**
   * Ready for the service worker
   *
   * Waits for the service worker will be achieved to activated.
   *
   * @param options - A {@link SvcWorkerControllerReadyOptions | Service Worker Controller ready options}
   * @throws {@link SvcWorkerControllerError} when the service worker will not be achieved to activated
   * @throws {@link DOMException} when the operation is aborted
   */
  ready(options?: SvcWorkerControllerReadyOptions): Promise<void>
  /**
   * Shutdown the service worker
   *
   * Waits for the service worker will be achieved to unregister.
   *
   * @param signal - Abort signal to cancel the operation
   * @throws {@link SvcWorkerControllerError} when the service worker will not achieved to unregister
   * @throws {@link DOMException} when the operation is aborted
   */
  shutdown(signal?: AbortSignal): Promise<void>
}

/**
 * Create a Service worker controller instance
 *
 * @param options {@link SvcWorkerControllerOptions | Service worker controller options}
 * @returns - {@link SvcWorkerController | Service worker controller instance}
 */
export function createSvcWorkerController(
  options: SvcWorkerControllerOptions
): Readonly<SvcWorkerController> {
  const { scriptURL, debug: _debug, ...registrationOptions } = options
  _debug?.('Creating Service Worker Controller with options:', options)

  const _emitter = createEmitter()
  let _registration: ServiceWorkerRegistration | null = null
  let _sw: ServiceWorker | null = null

  /**
   * Wait for service worker state change
   */
  function waitForState(
    sw: ServiceWorker,
    targetState: ServiceWorkerState,
    signal?: AbortSignal
  ): Promise<ServiceWorker> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }

      if (sw.state === targetState) {
        resolve(sw)
        return
      }

      const onStateChange = (): void => {
        _debug?.(`Service Worker state changed: ${sw.state}`)
        if (sw.state === targetState) {
          cleanup()
          resolve(sw)
        } else if (sw.state === 'redundant') {
          cleanup()
          reject(new SvcWorkerControllerError('Service Worker became redundant'))
        }
      }

      const onAbort = (): void => {
        cleanup()
        reject(new DOMException('Aborted', 'AbortError'))
      }

      const cleanup = (): void => {
        sw.removeEventListener('statechange', onStateChange)
        signal?.removeEventListener('abort', onAbort)
      }

      sw.addEventListener('statechange', onStateChange)
      signal?.addEventListener('abort', onAbort)
    })
  }

  /**
   * Wait for controller change (when clients.claim() is called)
   */
  function waitForControllerChange(signal?: AbortSignal): Promise<ServiceWorker> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }

      if (navigator.serviceWorker.controller) {
        resolve(navigator.serviceWorker.controller)
        return
      }

      const onControllerChange = (): void => {
        _debug?.('Controller changed')
        cleanup()
        resolve(navigator.serviceWorker.controller!)
      }

      const onAbort = (): void => {
        cleanup()
        reject(new DOMException('Aborted', 'AbortError'))
      }

      const cleanup = (): void => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
        signal?.removeEventListener('abort', onAbort)
      }

      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
      signal?.addEventListener('abort', onAbort)
    })
  }

  function isReady(): boolean {
    return !!_registration && !!_sw && _sw.state === 'activated'
  }

  /**
   * Ready for the service worker
   */
  async function ready(readyOptions?: SvcWorkerControllerReadyOptions): Promise<void> {
    const { claim = false, signal } = readyOptions ?? {}

    if (isReady()) {
      _debug?.('Service Worker is already ready')
      return
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    _debug?.('Registering Service Worker:', scriptURL)

    try {
      _registration = await navigator.serviceWorker.register(scriptURL, registrationOptions)
      _debug?.('Service Worker registered:', _registration)

      // Get the installing, waiting, or active service worker
      const sw = _registration.installing ?? _registration.waiting ?? _registration.active
      if (!sw) {
        throw new SvcWorkerControllerError('No Service Worker found after registration')
      }
      _sw = sw
      _debug?.(`Service Worker state: ${sw.state}`)

      // Wait for activation
      if (sw.state !== 'activated') {
        _sw = await waitForState(sw, 'activated', signal)
      }
      _debug?.('Service Worker activated')

      // If claim option is true, wait for controller change
      if (claim) {
        _sw = await waitForControllerChange(signal)
        _debug?.('Service Worker claimed clients')
      }
    } catch (error) {
      // Re-throw DOMException for abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }
      // Wrap other errors in SvcWorkerControllerError
      if (!(error instanceof SvcWorkerControllerError)) {
        throw new SvcWorkerControllerError(
          `Failed to activate Service Worker: ${error instanceof Error ? error.message : String(error)}`,
          error as Error
        )
      }
      throw error
    }
  }

  /**
   * Shutdown the service worker
   */
  async function shutdown(signal?: AbortSignal): Promise<void> {
    if (!isReady()) {
      _debug?.('Service Worker is not ready, nothing to shutdown')
      return
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    _debug?.('Shutting down Service Worker')

    try {
      const registration = await navigator.serviceWorker.getRegistration(registrationOptions.scope)

      // Check for abort after async operation
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      if (!registration) {
        _debug?.('No Service Worker registration found')
        return
      }

      if (_registration !== registration) {
        throw new SvcWorkerControllerError('Unmatch service worker registration')
      }

      const success = await registration.unregister()
      if (!success) {
        throw new SvcWorkerControllerError('Failed to unregister Service Worker')
      }

      _debug?.('Service Worker unregistered successfully')

      _registration = null
      _sw = null
    } catch (error) {
      // Re-throw DOMException for abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }
      // Wrap other errors in SvcWorkerControllerError
      if (!(error instanceof SvcWorkerControllerError)) {
        throw new SvcWorkerControllerError(
          `Failed to shutdown Service Worker: ${error instanceof Error ? error.message : String(error)}`,
          error as Error
        )
      }
      throw error
    }
  }

  return Object.freeze({
    ..._emitter,
    ready,
    shutdown
  })
}
