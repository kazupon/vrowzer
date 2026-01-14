/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/**
 * Filter regex for quick detection (used in `transform.filter.code`)
 *
 * Detects: `createSvcWorkerController(`
 */
export const SW_CONTROLLER_FILTER_RE = /createSvcWorkerController\s*\(/

/**
 * Detailed regex for extracting scriptURL from createSvcWorkerController call
 *
 * Detects: `createSvcWorkerController({ scriptURL: new URL('path', import.meta.url), ... })`
 *
 * Capture groups:
 * - [1]: Full URL expression: `new URL('path', import.meta.url)`
 * - [2]: URL path literal: 'path' or "path" or `path`
 *
 * Uses 'd' flag for indices (`match.indices`) and 'g' flag for global matching
 */
export const SW_CONTROLLER_URL_RE =
  /\bcreateSvcWorkerController\s*\(\s*\{[^}]*scriptURL\s*:\s*(new\s+URL\s*\(\s*('[^']+'|"[^"]+"|`[^`]+`)\s*,\s*import\.meta\.url\s*\))/dg

/**
 * Query parameter for Service Worker files in dev mode
 */
export const SW_QUERY = 'sw'

/**
 * File ID for Service Worker identification
 */
export const SW_FILE_ID = 'service_worker_file'

/**
 * Placeholder regex for replacing Service Worker asset URLs in build mode
 * Format: __SW_ASSET__<hash>__
 */
export const SW_ASSET_RE = /__SW_ASSET__([a-z\d]+)__/g

/**
 * Placeholder prefix for Service Worker assets
 */
export const SW_ASSET_PREFIX = '__SW_ASSET__'

/**
 * Placeholder suffix for Service Worker assets
 */
export const SW_ASSET_SUFFIX = '__'
