/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import path from 'node:path'
import MagicString from 'magic-string'
import { detectServiceWorkers, hasServiceWorkerController } from '../core/detect.ts'
import { SW_CONTROLLER_FILTER_RE } from '../core/constants.ts'

import type { DetectedServiceWorker } from '../core/detect.ts'

/**
 * Transform context provided by the plugin.
 */
interface TransformContext {
  /**
   * Source file ID
   */
  id: string
  /**
   * Source code
   */
  code: string
  /**
   * Whether in build mode
   */
  isBuild: boolean
}

/**
 * Result of resolving a Service Worker path.
 */
export interface ResolvedServiceWorker {
  /**
   * Detected Service Worker info
   */
  detected: DetectedServiceWorker
  /**
   * Resolved absolute file path
   */
  filePath: string
  /**
   * Relative URL path from source
   */
  urlPath: string
}

/**
 * Result of transform operation.
 */
export interface TransformResult {
  /**
   * Transformed code
   */
  code: string
  /**
   * Source map
   */
  map: ReturnType<MagicString['generateMap']>
}

/**
 * Filter regex for transform (exported for use in unplugin filter).
 */
const transformFilterRE = SW_CONTROLLER_FILTER_RE

/**
 * Quick check if code needs transformation.
 *
 * @param code - Source code
 * @returns true if transformation is needed
 */
export function needsTransform(code: string): boolean {
  return hasServiceWorkerController(code)
}

/**
 * Resolve Service Worker path to absolute file path.
 *
 * @param urlPath - URL path from source (e.g., './sw.js')
 * @param sourceId - Source file ID
 * @returns Resolved absolute file path
 */
export function resolveServiceWorkerPath(urlPath: string, sourceId: string): string {
  if (urlPath.startsWith('.')) {
    // Relative path
    return path.resolve(path.dirname(sourceId), urlPath)
  } else if (urlPath.startsWith('/')) {
    // Absolute path (will be resolved by bundler)
    return urlPath
  }
  // Other paths (module paths, etc.)
  return path.resolve(path.dirname(sourceId), urlPath)
}

/**
 * Detect and resolve all Service Workers in the code.
 *
 * @param code - Source code
 * @param sourceId - Source file ID
 * @returns Array of resolved Service Worker information
 */
export function detectAndResolveServiceWorkers(
  code: string,
  sourceId: string
): ResolvedServiceWorker[] {
  const detected = detectServiceWorkers(code)

  return detected.map(sw => ({
    detected: sw,
    filePath: resolveServiceWorkerPath(sw.urlPath, sourceId),
    urlPath: sw.urlPath
  }))
}

/**
 * Generate transform result from `MagicString`.
 *
 * @param s - MagicString instance
 * @param sourceId - Source file ID
 * @returns Transform result
 */
export function generateTransformResult(s: MagicString, sourceId: string): TransformResult {
  return {
    code: s.toString(),
    map: s.generateMap({
      source: sourceId,
      file: `${sourceId}.map`,
      includeContent: true
    })
  }
}

/**
 * Replace URL expression in code.
 *
 * @param s - MagicString instance
 * @param sw - Detected Service Worker
 * @param newUrl - New URL to replace with
 */
export function replaceUrlExpression(
  s: MagicString,
  sw: DetectedServiceWorker,
  newUrl: string
): void {
  s.update(
    sw.startIndex,
    sw.endIndex,
    `new URL(/* @vite-ignore */ ${JSON.stringify(newUrl)}, '' + import.meta.url)`
  )
}
