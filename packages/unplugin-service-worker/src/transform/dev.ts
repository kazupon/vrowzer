/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import MagicString from 'magic-string'
import { SW_FILE_ID, SW_QUERY } from '../core/constants.ts'
import {
  detectAndResolveServiceWorkers,
  generateTransformResult,
  needsTransform,
  replaceUrlExpression
} from './utils.ts'

import type { TransformResult } from './utils.ts'

/**
 * Options for dev transform
 */
export interface DevTransformOptions {
  /** Base URL for assets (default: '/') */
  base?: string
}

/**
 * Inject query parameter to URL for dev mode identification
 *
 * @param url - Original URL
 * @returns URL with query parameter
 */
export function injectDevQuery(url: string): string {
  const hasQuery = url.includes('?')
  const separator = hasQuery ? '&' : '?'
  return `${url}${separator}${SW_QUERY}=${SW_FILE_ID}`
}

/**
 * Check if a URL has Service Worker query parameter
 *
 * @param url - URL to check
 * @returns true if URL has Service Worker query
 */
export function hasServiceWorkerQuery(url: string): boolean {
  return url.includes(`${SW_QUERY}=${SW_FILE_ID}`)
}

/**
 * Parse Service Worker query from URL
 *
 * @param url - URL with query parameter
 * @returns Parsed query info or null
 */
export function parseServiceWorkerQuery(url: string): { isServiceWorker: boolean } | null {
  if (!hasServiceWorkerQuery(url)) {
    return null
  }
  return { isServiceWorker: true }
}

/**
 * Remove Service Worker query from URL to get clean path
 *
 * @param url - URL with query parameter
 * @returns Clean URL without query
 */
export function cleanServiceWorkerUrl(url: string): string {
  const queryStart = url.indexOf('?')
  if (queryStart === -1) {
    return url
  }
  return url.slice(0, queryStart)
}

/**
 * Transform code for dev mode
 *
 * In dev mode, Service Worker URLs are transformed to include
 * query parameters that identify them for special handling.
 *
 * Example:
 * ```
 * // Before:
 * createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })
 *
 * // After:
 * createSvcWorkerController({ scriptURL: new URL('./sw.js?sw=service_worker_file', import.meta.url) })
 * ```
 *
 * @param code - Source code
 * @param id - Source file ID
 * @param options - Transform options
 * @returns Transform result or null if no transformation needed
 */
export function transformDev(
  code: string,
  id: string,
  _options: DevTransformOptions = {}
): TransformResult | null {
  if (!needsTransform(code)) {
    return null
  }

  const resolved = detectAndResolveServiceWorkers(code, id)
  if (resolved.length === 0) {
    return null
  }

  const s = new MagicString(code)

  for (const sw of resolved) {
    // In dev mode, we just add query parameter to the URL
    // The bundler (Vite) will handle the actual bundling
    const devUrl = injectDevQuery(sw.urlPath)
    replaceUrlExpression(s, sw.detected, devUrl)
  }

  return generateTransformResult(s, id)
}

/**
 * Get list of watched files for dev mode
 *
 * @param code - Source code
 * @param id - Source file ID
 * @returns List of file paths to watch
 */
export function getWatchedFiles(code: string, id: string): string[] {
  if (!needsTransform(code)) {
    return []
  }

  const resolved = detectAndResolveServiceWorkers(code, id)
  return resolved.map(sw => sw.filePath)
}
