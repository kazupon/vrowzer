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
  const _emitter = createEmitter()

  _debug?.('Creating Service Worker Controller with options:', options)

  /**
   * Wait for service worker state change
   */
  function waitForState(
    sw: ServiceWorker,
    targetState: ServiceWorkerState,
    signal?: AbortSignal
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }

      if (sw.state === targetState) {
        resolve()
        return
      }

      const onStateChange = (): void => {
        _debug?.(`Service Worker state changed: ${sw.state}`)
        if (sw.state === targetState) {
          cleanup()
          resolve()
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
  function waitForControllerChange(signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }

      if (navigator.serviceWorker.controller) {
        resolve()
        return
      }

      const onControllerChange = (): void => {
        _debug?.('Controller changed')
        cleanup()
        resolve()
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

  /**
   * Ready for the service worker
   */
  async function ready(readyOptions?: SvcWorkerControllerReadyOptions): Promise<void> {
    const { claim = false, signal } = readyOptions ?? {}

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    _debug?.('Registering Service Worker:', scriptURL)

    try {
      const registration = await navigator.serviceWorker.register(scriptURL, registrationOptions)
      _debug?.('Service Worker registered:', registration)

      // Get the installing, waiting, or active service worker
      const sw = registration.installing ?? registration.waiting ?? registration.active
      if (!sw) {
        throw new SvcWorkerControllerError('No Service Worker found after registration')
      }
      _debug?.(`Service Worker state: ${sw.state}`)

      // Wait for activation
      if (sw.state !== 'activated') {
        await waitForState(sw, 'activated', signal)
      }
      _debug?.('Service Worker activated')

      // If claim option is true, wait for controller change
      if (claim) {
        await waitForControllerChange(signal)
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

      const success = await registration.unregister()
      if (!success) {
        throw new SvcWorkerControllerError('Failed to unregister Service Worker')
      }

      _debug?.('Service Worker unregistered successfully')
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
