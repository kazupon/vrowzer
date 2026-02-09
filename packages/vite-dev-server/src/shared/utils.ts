import { NULL_BYTE_PLACEHOLDER, VALID_ID_PREFIX } from './constants'

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

/**
 * Prepend `/@id/` and replace null byte so the id is URL-safe.
 * This is prepended to resolved ids that are not valid browser
 * import specifiers by the importAnalysis plugin.
 */
export function wrapId(id: string): string {
  return id.startsWith(VALID_ID_PREFIX)
    ? id
    : VALID_ID_PREFIX + id.replace('\0', NULL_BYTE_PLACEHOLDER)
}

/**
 * Undo {@link wrapId}'s `/@id/` and null byte replacements.
 */
export function unwrapId(id: string): string {
  return id.startsWith(VALID_ID_PREFIX)
    ? id.slice(VALID_ID_PREFIX.length).replace(NULL_BYTE_PLACEHOLDER, '\0')
    : id
}

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

// NOTE(kazupon):
// The following codes are browser-compatible implementations

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

// ------------------------------------------------------------------------------------------------
// @vrowser/vite-dev-server original code below
// ------------------------------------------------------------------------------------------------

/**
 * below code is forked from unjs/mlly
 * repo: https://github.com/unjs/mlly
 * loc: https://github.com/unjs/mlly/blob/main/src/syntax.ts#L20-L43
 * license: MIT
 */

/**
 * Options for detecting syntax within a code string.
 */
export type DetectSyntaxOptions = {
  /**
   * Indicates whether comments should be stripped from the code before syntax checking.
   * @default false
   */
  stripComments?: boolean;
};

const ESM_RE = /(?:[\s;]|^)(?:import[\s\w*,{}]*from|import\s*["'*{]|export\b\s*(?:[*{]|default|class|type|function|const|var|let|async function)|import\.meta\b)/m;
const COMMENT_RE = /\/\*.+?\*\/|\/\/.*(?=[nr])/g;

/**
 * Determines if a given code string contains ECMAScript module syntax.
 *
 * @param {string} code - The source code to analyse.
 * @param {DetectSyntaxOptions} opts - See {@link DetectSyntaxOptions}.
 * @returns {boolean} `true` if the code contains ESM syntax, otherwise `false`.
 */
export function hasESMSyntax(code: string, opts: DetectSyntaxOptions = {}) {
  if (opts.stripComments) {
    code = code.replace(COMMENT_RE, "");
  }
  return ESM_RE.test(code);
}

/**
 * Convert a Node.js-style callback function to a promise-returning function.
 * The callback must follow the `(err, result)` convention.
 */
export function promisify<TArgs extends unknown[], TResult>(
  fn: (...args: [...TArgs, (err: unknown, result: TResult) => void]) => void,
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) =>
    new Promise<TResult>((resolve, reject) => {
      ;(fn as Function)(...args, (err: unknown, result: TResult) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
}

