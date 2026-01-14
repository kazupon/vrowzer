/**
 * Service Worker Administration API
 *
 * Provides management functions for service workers registered via {@link SvcWorkerController}.
 * Implements kill switch / circuit breaker pattern for fail-safe control.
 *
 * This module does not bypass `navigator.serviceWorker` APIs directly.
 * It only operates on service workers managed by `SvcWorkerController`.
 *
 * @module admin
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { V_SW_SESSION_CIRCUIT_BREAKER } from './protocols.ts'
import { SESSION_SYMBOL } from './symbols.ts'
import * as registry from './registry.ts'

import type { SvcWorkerController, SvcWorkerControllerInternal } from './controller.ts'
import type {
  SvcWorkerSessionCircuitBreakerResult,
  SvcWorkerSessionResumeResult
} from './protocols.ts'

/**
 * Get all registered service worker controllers.
 *
 * @returns A readonly array of all registered controllers
 *
 * @example
 * ```ts
 * import { getAllControllers } from '@vrowser/service-worker/admin'
 *
 * const controllers = getAllControllers()
 * for (const controller of controllers) {
 *   console.log(`${controller.scriptURL} (${controller.version}): ${controller.state}`)
 * }
 * ```
 */
export function getAllControllers(): readonly SvcWorkerController[] {
  return registry.getAll()
}

/**
 * Get a controller by its script URL and version.
 *
 * @param scriptURL - The service worker script URL (must be a URL object)
 * @param version - The service worker version
 * @returns The controller if found, undefined otherwise
 *
 * @example
 * ```ts
 * import { getController } from '@vrowser/service-worker/admin'
 *
 * const controller = getController(new URL('./sw.js', import.meta.url), 'v1.0.0')
 * if (controller) {
 *   console.log(`Found controller: ${controller.state}`)
 * }
 * ```
 */
export function getController(scriptURL: URL, version: string): SvcWorkerController | undefined {
  return registry.get(scriptURL, version)
}

/**
 * Dispose all registered controllers.
 *
 * This will clean up resources but will NOT terminate the service workers.
 * Use {@link terminateAllServiceWorkers} to terminate service workers.
 *
 * @example
 * ```ts
 * import { disposeAllControllers } from '@vrowser/service-worker/admin'
 *
 * // Clean up all controllers on page unload
 * window.addEventListener('unload', () => {
 *   disposeAllControllers()
 * })
 * ```
 */
export function disposeAllControllers(): void {
  for (const controller of registry.getAll()) {
    controller.dispose()
  }
}

/**
 * Options for suspend operations.
 */
export interface SuspendOptions {
  /**
   * Whether to clear all caches when suspending.
   */
  clearCaches?: boolean
  /**
   * Optional abort signal to cancel the operation.
   */
  signal?: AbortSignal
}

/**
 * Suspend all registered service workers (soft kill / circuit breaker).
 *
 * This engages the circuit breaker on all service workers, disabling
 * their functionality without unregistering them.
 *
 * @param options - Suspend options
 * @returns Map of registry keys to suspend results
 *
 * @example
 * ```ts
 * import { suspendAllServiceWorkers } from '@vrowser/service-worker/admin'
 *
 * // Suspend all service workers (e.g., for maintenance)
 * const results = await suspendAllServiceWorkers()
 * for (const [key, result] of results) {
 *   console.log(`${key}: suspended=${result.mode === 'suspend'}`)
 * }
 * ```
 */
export async function suspendAllServiceWorkers(
  options?: SuspendOptions
): Promise<Map<string, SvcWorkerSessionCircuitBreakerResult>> {
  const results = new Map<string, SvcWorkerSessionCircuitBreakerResult>()
  for (const controller of registry.getAll()) {
    if (controller.state === 'activated') {
      const key = registry.getRegistryKey(controller.scriptURL, controller.version)
      const result = await controller.suspend(options)
      results.set(key, result)
    }
  }
  return results
}

/**
 * Suspend a specific service worker (soft kill / circuit breaker).
 *
 * This engages the circuit breaker, disabling service worker functionality
 * without unregistering it.
 *
 * @param scriptURL - The service worker script URL (must be a URL object)
 * @param version - The service worker version
 * @param options - Suspend options
 * @returns Result of the suspend operation
 * @throws Error if controller is not found
 *
 * @example
 * ```ts
 * import { suspendServiceWorker } from '@vrowser/service-worker/admin'
 *
 * // Suspend a specific service worker
 * const result = await suspendServiceWorker(new URL('./sw.js', import.meta.url), 'v1.0.0')
 * console.log(`Suspended: ${result.mode === 'suspend'}`)
 * ```
 */
export async function suspendServiceWorker(
  scriptURL: URL,
  version: string,
  options?: SuspendOptions
): Promise<SvcWorkerSessionCircuitBreakerResult> {
  const controller = registry.get(scriptURL, version)
  if (!controller) {
    throw new Error(`Controller not found for ${scriptURL.href}::${version}`)
  }
  return controller.suspend(options)
}

/**
 * Options for terminate operations.
 */
export interface TerminateOptions {
  /**
   * Whether to clear all caches when terminating.
   */
  clearCaches?: boolean
  /**
   * Optional abort signal to cancel the operation.
   */
  signal?: AbortSignal
}

/**
 * Terminate all registered service workers (hard kill / circuit breaker trip).
 *
 * This trips the circuit breaker on all service workers, causing them
 * to unregister themselves. This is a destructive operation.
 *
 * @param options - Terminate options
 * @returns Map of registry keys to terminate results
 *
 * @example
 * ```ts
 * import { terminateAllServiceWorkers } from '@vrowser/service-worker/admin'
 *
 * // Terminate all service workers (e.g., for emergency shutdown)
 * const results = await terminateAllServiceWorkers({ clearCaches: true })
 * for (const [key, result] of results) {
 *   console.log(`${key}: terminated=${result.terminated}`)
 * }
 * ```
 */
export async function terminateAllServiceWorkers(
  options?: TerminateOptions
): Promise<Map<string, SvcWorkerSessionCircuitBreakerResult>> {
  const results = new Map<string, SvcWorkerSessionCircuitBreakerResult>()
  // Get all controllers first since termination modifies the registry
  const controllers = [...registry.getAll()]
  for (const controller of controllers) {
    const internal = controller as SvcWorkerControllerInternal
    const session = internal[SESSION_SYMBOL]
    if (!session) {
      continue
    }
    const key = registry.getRegistryKey(controller.scriptURL, controller.version)
    // Send terminate message via session.send() (dedicated protocol)
    const result = await session.send<SvcWorkerSessionCircuitBreakerResult>(
      {
        type: V_SW_SESSION_CIRCUIT_BREAKER,
        mode: 'terminate',
        clearCaches: options?.clearCaches
      },
      options?.signal ? { signal: options.signal } : undefined
    )
    results.set(key, result)
  }
  return results
}

/**
 * Terminate a specific service worker (hard kill / circuit breaker trip).
 *
 * This trips the circuit breaker, causing the service worker to unregister
 * itself. This is a destructive operation.
 *
 * @param scriptURL - The service worker script URL (must be a URL object)
 * @param version - The service worker version
 * @param options - Terminate options
 * @returns Result of the terminate operation
 * @throws Error if controller is not found or session is not established
 *
 * @example
 * ```ts
 * import { terminateServiceWorker } from '@vrowser/service-worker/admin'
 *
 * // Terminate a specific service worker
 * const result = await terminateServiceWorker(new URL('./sw.js', import.meta.url), 'v1.0.0', { clearCaches: true })
 * console.log(`Terminated: ${result.terminated}`)
 * ```
 */
export async function terminateServiceWorker(
  scriptURL: URL,
  version: string,
  options?: TerminateOptions
): Promise<SvcWorkerSessionCircuitBreakerResult> {
  const controller = registry.get(scriptURL, version)
  if (!controller) {
    throw new Error(`Controller not found for ${scriptURL.href}::${version}`)
  }
  const internal = controller as SvcWorkerControllerInternal
  const session = internal[SESSION_SYMBOL]
  if (!session) {
    throw new Error(`Session not established for ${scriptURL.href}::${version}`)
  }
  // Send terminate message via session.send() (dedicated protocol)
  return session.send<SvcWorkerSessionCircuitBreakerResult>(
    {
      type: V_SW_SESSION_CIRCUIT_BREAKER,
      mode: 'terminate',
      clearCaches: options?.clearCaches
    },
    options?.signal ? { signal: options.signal } : undefined
  )
}

/**
 * Resume all suspended service workers.
 *
 * This disengages the circuit breaker on all suspended service workers,
 * restoring their functionality.
 *
 * @param signal - Optional abort signal to cancel the operation
 * @returns Map of registry keys to resume results
 *
 * @example
 * ```ts
 * import { resumeAllServiceWorkers } from '@vrowser/service-worker/admin'
 *
 * // Resume all suspended service workers
 * const results = await resumeAllServiceWorkers()
 * for (const [key, result] of results) {
 *   console.log(`${key}: resumed`)
 * }
 * ```
 */
export async function resumeAllServiceWorkers(
  signal?: AbortSignal
): Promise<Map<string, SvcWorkerSessionResumeResult>> {
  const results = new Map<string, SvcWorkerSessionResumeResult>()
  for (const controller of registry.getAll()) {
    if (controller.state === 'suspended') {
      const key = registry.getRegistryKey(controller.scriptURL, controller.version)
      const result = await controller.resume(signal ? { signal } : undefined)
      results.set(key, result)
    }
  }
  return results
}

/**
 * Resume a specific suspended service worker.
 *
 * This disengages the circuit breaker, restoring service worker functionality.
 *
 * @param scriptURL - The service worker script URL (must be a URL object)
 * @param version - The service worker version
 * @param signal - Optional abort signal to cancel the operation
 * @returns Result of the resume operation
 * @throws Error if controller is not found
 *
 * @example
 * ```ts
 * import { resumeServiceWorker } from '@vrowser/service-worker/admin'
 *
 * // Resume a specific service worker
 * const result = await resumeServiceWorker(new URL('./sw.js', import.meta.url), 'v1.0.0')
 * console.log('Resumed successfully')
 * ```
 */
export async function resumeServiceWorker(
  scriptURL: URL,
  version: string,
  signal?: AbortSignal
): Promise<SvcWorkerSessionResumeResult> {
  const controller = registry.get(scriptURL, version)
  if (!controller) {
    throw new Error(`Controller not found for ${scriptURL.href}::${version}`)
  }
  return controller.resume(signal ? { signal } : undefined)
}
