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
 * Currently empty — will be extended for HMR relay, etc.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ServiceWorkerFunctions {
  // Future:
  // hmrUpdate: (payload: HotPayload) => void
  // optimizerMetadataSync: (metadata: DepOptimizationMetadata) => void
}
