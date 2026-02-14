/**
 * `node:url` compatible entry point
 *
 * @module url
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

declare const Deno: { build: { os: string } } | undefined

const isWindows: boolean = (() => {
  // Deno
  if (typeof Deno !== 'undefined' && Deno?.build?.os) {
    return Deno.build.os === 'windows'
  }
  // Node.js / Bun
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform === 'win32'
  }
  // Browser
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    return navigator.userAgent.includes('Windows')
  }
  return false
})()

/**
 * Convert a file URL to a file path (browser compatible)
 * Polyfill for Node.js `url.fileURLToPath`
 */
export function fileURLToPath(url: string | URL): string {
  const urlObj = typeof url === 'string' ? new URL(url) : url

  if (urlObj.protocol !== 'file:') {
    throw new TypeError('The URL must be of scheme file')
  }

  let pathname = decodeURIComponent(urlObj.pathname)

  // Handle Windows paths (e.g., file:///C:/path/to/file)
  if (isWindows && pathname.startsWith('/') && /^\/[a-zA-Z]:/.test(pathname)) {
    pathname = pathname.slice(1)
  }

  return pathname
}

/**
 * Convert a file path to a file URL (browser compatible)
 * Polyfill for Node.js `url.pathToFileURL`
 */
export function pathToFileURL(path: string): URL {
  let resolved = path

  // Handle Windows paths
  if (isWindows) {
    resolved = resolved.replace(/\\/g, '/')
    // Add leading slash for Windows absolute paths (C:/path -> /C:/path)
    if (/^[a-zA-Z]:/.test(resolved)) {
      resolved = '/' + resolved
    }
  }

  // Ensure leading slash for absolute paths
  if (!resolved.startsWith('/')) {
    resolved = '/' + resolved
  }

  return new URL('file://' + encodeURI(resolved))
}

export const URL = globalThis.URL
