/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import MagicString from 'magic-string'
import { SW_ASSET_PREFIX, SW_ASSET_RE, SW_ASSET_SUFFIX } from '../core/constants.ts'
import { hash } from '../core/hash.ts'
import {
  detectAndResolveServiceWorkers,
  generateTransformResult,
  needsTransform,
  replaceUrlExpression
} from './utils.ts'

import type { ServiceWorkerCache } from '../core/cache.ts'
import type { TransformResult, ResolvedServiceWorker } from './utils.ts'

/**
 * Result of build transform.
 */
export interface BuildTransformResult extends TransformResult {
  /**
   * Resolved Service Workers that need bundling
   */
  serviceWorkers: ResolvedServiceWorker[]
}

/**
 * Options for build transform.
 */
export interface BuildTransformOptions {
  /**
   * Service Worker cache instance
   */
  cache: ServiceWorkerCache
}

/**
 * Generate placeholder hash from file path.
 *
 * @param filePath - Absolute file path
 * @returns Hash string
 */
export function generatePlaceholderHash(filePath: string): string {
  return hash(filePath)
}

/**
 * Generate placeholder URL for Service Worker.
 *
 * @param filePath - Absolute file path
 * @returns Placeholder URL (e.g., "__SW_ASSET__abc123__")
 */
export function generatePlaceholder(filePath: string): string {
  const hash = generatePlaceholderHash(filePath)
  return `${SW_ASSET_PREFIX}${hash}${SW_ASSET_SUFFIX}`
}

/**
 * Transform code for build mode.
 *
 * In build mode, Service Worker URLs are replaced with placeholders
 * that will be resolved in renderChunk after bundling.
 *
 * @example
 * ```ts
 * // Before:
 * createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })
 *
 * // After (with placeholder):
 * createSvcWorkerController({ scriptURL: new URL('__SW_ASSET__abc123__', import.meta.url) })
 *
 * // After renderChunk (final):
 * createSvcWorkerController({ scriptURL: new URL('assets/sw-xyz789.js', import.meta.url) })
 * ```
 *
 * @param code - Source code
 * @param id - Source file ID
 * @param options - Transform options
 * @returns Transform result with Service Workers to bundle, or null if no transformation needed
 */
export function transformBuild(
  code: string,
  id: string,
  options: BuildTransformOptions
): BuildTransformResult | null {
  if (!needsTransform(code)) {
    return null
  }

  const resolved = detectAndResolveServiceWorkers(code, id)
  if (resolved.length === 0) {
    return null
  }

  const s = new MagicString(code)
  const { cache } = options

  for (const sw of resolved) {
    // Check if bundle is already cached
    const cached = cache.getBundle(sw.filePath)
    if (cached) {
      // Use cached placeholder
      replaceUrlExpression(s, sw.detected, cached.entryUrlPlaceholder)
    } else {
      // Generate new placeholder (will be populated during bundling)
      const placeholder = generatePlaceholder(sw.filePath)
      replaceUrlExpression(s, sw.detected, placeholder)
    }
  }

  const result = generateTransformResult(s, id)
  return {
    ...result,
    serviceWorkers: resolved
  }
}

/**
 * Replace placeholders in chunk code with actual asset URLs.
 *
 * @param code - Chunk code with placeholders
 * @param cache - Service Worker cache
 * @param base - Base URL (default: '/')
 * @returns Transformed code, or null if no replacements made
 */
export function replacePlaceholders(
  code: string,
  cache: ServiceWorkerCache,
  base: string = '/'
): string | null {
  // Reset regex lastIndex
  SW_ASSET_RE.lastIndex = 0

  if (!SW_ASSET_RE.test(code)) {
    return null
  }

  // Reset again for actual replacement
  SW_ASSET_RE.lastIndex = 0

  const replaced = code.replace(SW_ASSET_RE, (match: string, hash: string) => {
    const filename = cache.getFilenameFromHash(hash)
    if (filename) {
      // Construct full URL with base
      const url = base.endsWith('/') ? `${base}${filename}` : `${base}/${filename}`
      return url
    }
    // Keep placeholder if not found (shouldn't happen in normal usage)
    return match
  })

  return replaced
}

/**
 * Extract placeholder hashes from code.
 *
 * @param code - Code containing placeholders
 * @returns Array of hashes
 */
export function extractPlaceholderHashes(code: string): string[] {
  const hashes: string[] = []
  SW_ASSET_RE.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = SW_ASSET_RE.exec(code))) {
    if (match[1]) {
      hashes.push(match[1])
    }
  }

  return hashes
}
