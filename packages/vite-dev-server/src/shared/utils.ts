// TODO: fill in later ...

const _globalThis = globalThis as any

export const isWindows: boolean = (() => {
  // Deno
  if (_globalThis.Deno?.build?.os) {
    return _globalThis.Deno.build.os === 'windows'
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
// NOTE(kazupon): for browser env, we assume non-windows
// export const isWindows: boolean =
//   typeof process !== 'undefined' && process.platform === 'win32'

// TODO: fill in code later ...

const windowsSlashRE = /\\/g
export function slash(p: string): string {
  return p.replace(windowsSlashRE, '/')
}

const postfixRE = /[?#].*$/
export function cleanUrl(url: string): string {
  return url.replace(postfixRE, '')
}

export function splitFileAndPostfix(path: string): {
  file: string
  postfix: string
} {
  const file = cleanUrl(path)
  return { file, postfix: path.slice(file.length) }
}

// TODO: fill in code later ...

export function withTrailingSlash(path: string): string {
  if (path[path.length - 1] !== '/') {
    return `${path}/`
  }
  return path
}

// TODO: fill in later ...

export interface PromiseWithResolvers<T> {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
}
export function promiseWithResolvers<T>(): PromiseWithResolvers<T> {
  let resolve: any
  let reject: any
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  return { promise, resolve, reject }
}

// TODO: fill in later ...

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
