/**
 * Service Worker Controller Registry
 *
 * Manages registered SvcWorkerController instances.
 * Controllers register themselves when created and unregister when disposed.
 * Registry key is `scriptURL::version` to allow multiple versions of the same script.
 *
 * @module registry
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { SvcWorkerController } from './controller.ts'

/**
 * Extended controller interface with scriptURL and version properties.
 *
 * Used internally by the registry to identify controllers.
 *
 * @internal
 */
interface RegistrableController extends SvcWorkerController {
  readonly scriptURL: string
  readonly version: string
}

const controllers = new Map<string, SvcWorkerController>()

/**
 * Generate registry key from scriptURL and version.
 *
 * @param scriptURL - A service worker script URL
 * @param version - A service worker version
 * @returns A registry key
 *
 * @internal
 */
export function getRegistryKey(scriptURL: string | URL, version: string): string {
  const url = typeof scriptURL === 'string' ? scriptURL : scriptURL.href
  return `${url}::${version}`
}

/**
 * Register a controller instance.
 *
 * Called internally by `controller.ts` when a controller is created.
 *
 * @param controller - A {@link SvcWorkerController | service worker controller} to register
 *
 * @internal
 */
export function register(controller: SvcWorkerController): void {
  const registrable = controller as RegistrableController
  const key = getRegistryKey(registrable.scriptURL, registrable.version)
  controllers.set(key, controller)
}

/**
 * Unregister a controller instance.
 *
 * Called internally by `controller.ts` when a controller is disposed.
 *
 * @param controller - A {@link SvcWorkerController | service worker controller} to unregister
 *
 * @internal
 */
export function unregister(controller: SvcWorkerController): void {
  const registrable = controller as RegistrableController
  const key = getRegistryKey(registrable.scriptURL, registrable.version)
  controllers.delete(key)
}

/**
 * Get all registered controllers.
 *
 * @returns A readonly array of all registered {@link SvcWorkerController | service worker controllers}
 */
export function getAll(): readonly SvcWorkerController[] {
  return Array.from(controllers.values())
}

/**
 * Get a controller by its script URL and version.
 *
 * @param scriptURL - A service worker script URL
 * @param version - A service worker version
 * @returns A {@link SvcWorkerController | service worker controller} if found, undefined otherwise
 */
export function get(scriptURL: string | URL, version: string): SvcWorkerController | undefined {
  const key = getRegistryKey(scriptURL, version)
  return controllers.get(key)
}

/**
 * Clear all registered controllers.
 *
 * Used for testing purposes.
 *
 * @internal
 */
export function clear(): void {
  controllers.clear()
}
