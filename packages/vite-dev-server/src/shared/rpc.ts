/**
 * RPC type definitions for Service Worker ↔ Web Worker communication
 *
 * Defines the typed function interfaces used with birpc
 * for bidirectional RPC between Service Worker and Web Worker.
 *
 * @module shared/rpc
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { TransformOptions, TransformResult } from '../node/server/transformRequest'

const serializedRpcErrorMarker = '__vrowzerRpcError'

interface ErrorWithMetadata extends Error {
  code?: unknown
  id?: unknown
}

interface SerializedRpcError {
  [serializedRpcErrorMarker]: true
  name: string
  message: string
  stack?: string
  code?: string
  id?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSerializedRpcError(value: unknown): value is SerializedRpcError {
  return (
    isRecord(value) &&
    value[serializedRpcErrorMarker] === true &&
    typeof value.name === 'string' &&
    typeof value.message === 'string' &&
    (value.stack === undefined || typeof value.stack === 'string') &&
    (value.code === undefined || typeof value.code === 'string') &&
    (value.id === undefined || typeof value.id === 'string')
  )
}

/**
 * Preserve Error metadata that the structured clone algorithm omits.
 * birpc response errors are stored in the top-level `e` property.
 */
export function serializeRpcMessage(message: unknown): unknown {
  if (!isRecord(message) || !(message.e instanceof Error)) {
    return message
  }

  const error = message.e as ErrorWithMetadata
  const code = typeof error.code === 'string' ? error.code : undefined
  const id = typeof error.id === 'string' ? error.id : undefined

  if (code === undefined && id === undefined) {
    return message
  }

  return {
    ...message,
    e: {
      [serializedRpcErrorMarker]: true,
      name: error.name,
      message: error.message,
      stack: error.stack,
      code,
      id,
    } satisfies SerializedRpcError,
  }
}

/**
 * Restore an Error serialized by {@link serializeRpcMessage}.
 */
export function deserializeRpcMessage(message: unknown): unknown {
  if (!isRecord(message) || !isSerializedRpcError(message.e)) {
    return message
  }

  const serializedError = message.e
  const error = new Error(serializedError.message) as ErrorWithMetadata
  error.name = serializedError.name
  if (serializedError.stack !== undefined) {
    error.stack = serializedError.stack
  }
  if (serializedError.code !== undefined) {
    error.code = serializedError.code
  }
  if (serializedError.id !== undefined) {
    error.id = serializedError.id
  }

  return {
    ...message,
    e: error,
  }
}

/**
 * Functions provided by the Web Worker (callable from Service Worker)
 *
 * These are the processing functions that run in the Web Worker
 * where DevEnvironment, PluginContainer, and rolldown operate.
 */
export interface WorkerFunctions {
  /**
   * Transform a module URL through the plugin pipeline.
   * Delegates to DevEnvironment.transformRequest() in the Web Worker.
   */
  transformRequest: (url: string, options?: TransformOptions) => Promise<TransformResult | null>

  /**
   * Apply HTML transforms (plugin hooks + script injection).
   * Delegates to devHtmlTransformFn() in the Web Worker.
   */
  transformIndexHtml: (url: string, html: string, originalUrl?: string) => Promise<string>

  /**
   * Warm up a URL by pre-transforming it.
   * Delegates to DevEnvironment.warmupRequest() in the Web Worker.
   * Best-effort: never throws, handles and reports errors internally.
   */
  warmupRequest: (url: string) => Promise<void>
}

/**
 * Functions provided by the Service Worker (callable from Web Worker)
 *
 * These are the functions that run in the Service Worker
 * where the Hono server and fetch handler operate.
 */
export interface ServiceWorkerFunctions {
  /**
   * Add plugin-resolved input paths to the Service Worker's filesystem
   * allowlist. Deny patterns still take precedence.
   */
  registerSafeModulePaths: (paths: string[]) => Promise<void>
}

interface SafeModulePathSyncEnvironment {
  _syncSafeModulePaths:
    | ((paths: string[]) => Promise<void>)
    | undefined
}

/**
 * Connect environment input registration to the current Service Worker RPC.
 * Calling this again replaces stale callbacks and sends a fresh snapshot.
 */
export async function connectSafeModulePathSync(
  environments: Iterable<SafeModulePathSyncEnvironment>,
  safeModulePaths: Iterable<string>,
  registerSafeModulePaths: ServiceWorkerFunctions['registerSafeModulePaths'],
): Promise<void> {
  const syncSafeModulePaths = async (paths: string[]) => {
    if (paths.length > 0) {
      await registerSafeModulePaths(paths)
    }
  }
  for (const environment of environments) {
    environment._syncSafeModulePaths = syncSafeModulePaths
  }
  await syncSafeModulePaths([...safeModulePaths])
}

/**
 * Create the RPC handlers backed by a Service Worker config's safe-path set.
 */
export function createServiceWorkerFunctions(
  safeModulePaths: Set<string>,
): ServiceWorkerFunctions {
  return {
    async registerSafeModulePaths(paths) {
      for (const path of paths) {
        safeModulePaths.add(path)
      }
    },
  }
}
