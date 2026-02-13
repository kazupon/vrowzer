/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { stripLiteral } from 'strip-literal'
import { SW_CONTROLLER_FILTER_RE, SW_CONTROLLER_URL_RE } from './constants.ts'

/**
 * Detected Service Worker information.
 */
export interface DetectedServiceWorker {
  /**
   * Full regex match string
   */
  fullMatch: string
  /**
   * URL expression: new URL('path', import.meta.url)
   */
  urlExpression: string
  /**
   * Extracted URL path (without quotes)
   */
  urlPath: string
  /**
   * Start index of URL expression in original code
   */
  startIndex: number
  /**
   * End index of URL expression in original code
   */
  endIndex: number
  /**
   * Scope value if specified (e.g., '/')
   */
  scope?: string
}

/**
 * Quick check if code contains createSvcWorkerController call.
 *
 * Use this for early filtering before detailed detection.
 */
export function hasServiceWorkerController(code: string): boolean {
  return SW_CONTROLLER_FILTER_RE.test(code)
}

/**
 * Detect all Service Worker controller patterns in the code.
 *
 * Detects patterns like:
 * @example
 * ```ts
 * createSvcWorkerController({
 *   scriptURL: new URL('./sw.js', import.meta.url),
 *   ...
 * })
 * ```
 *
 * @param code - Source code to analyze
 * @returns Array of detected Service Worker information
 */
export function detectServiceWorkers(code: string): DetectedServiceWorker[] {
  // Quick check first
  if (!hasServiceWorkerController(code)) {
    return []
  }

  // Strip comments and string literals to avoid false positives
  const cleanCode = stripLiteral(code)
  const results: DetectedServiceWorker[] = []

  // Reset lastIndex for global regex
  SW_CONTROLLER_URL_RE.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = SW_CONTROLLER_URL_RE.exec(cleanCode))) {
    // Get indices from 'd' flag
    const indices = match.indices
    if (!indices) {
      continue
    }

    // indices[0] = full match
    // indices[1] = URL expression (new URL(...))
    // indices[2] = URL path literal ('path' or "path" or `path`)
    // indices[3] = Scope literal (optional, e.g., '/' or "/app/")
    const urlIndices = indices[1]
    const pathIndices = indices[2]
    const scopeIndices = indices[3]
    if (!urlIndices || !pathIndices) {
      continue
    }
    const [urlStart, urlEnd] = urlIndices
    const [pathStart, pathEnd] = pathIndices

    const rawPath = code.slice(pathStart, pathEnd)

    // Skip dynamic template literals (e.g., `./sw-${version}.js`)
    if (rawPath[0] === '`' && rawPath.includes('${')) {
      continue
    }

    // Remove quotes from path
    const urlPath = rawPath.slice(1, -1)

    // Extract scope if present
    let scope: string | undefined
    if (scopeIndices) {
      const [scopeStart, scopeEnd] = scopeIndices
      const rawScope = code.slice(scopeStart, scopeEnd)
      // Remove quotes from scope
      scope = rawScope.slice(1, -1)
    }

    // @ts-expect-error -- FIXME
    results.push({
      fullMatch: match[0],
      urlExpression: code.slice(urlStart, urlEnd),
      urlPath,
      startIndex: urlStart,
      endIndex: urlEnd,
      scope
    })
  }

  return results
}
