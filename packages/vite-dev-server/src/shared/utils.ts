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
 * FNV-1a hash implementation (browser compatible)
 * Based on: https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function
 */
function fnv1aHash(data: Uint8Array): string {
  const FNV_PRIME = 0x01000193
  const FNV_OFFSET_BASIS = 0x811c9dc5

  let hash = FNV_OFFSET_BASIS
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i]!
    hash = Math.imul(hash, FNV_PRIME)
  }

  // Convert to unsigned 32-bit and then to base36 for compact representation
  return (hash >>> 0).toString(36)
}

/**
 * Generate an entity tag (browser compatible)
 * Similar to the 'etag' npm package but without Node.js dependencies
 */
export function generateEtag(
  entity: string | Uint8Array,
  options?: { weak?: boolean },
): string {
  const weak = options?.weak ?? true

  // Convert to Uint8Array for consistent processing
  const bytes = typeof entity === 'string'
    ? new TextEncoder().encode(entity)
    : entity

  if (bytes.length === 0) {
    // Fast-path empty content
    return weak ? 'W/"0-0"' : '"0-0"'
  }

  // Compute hash
  const hash = fnv1aHash(bytes)
  const len = bytes.length.toString(16)
  const tag = `"${len}-${hash}"`

  return weak ? `W/${tag}` : tag
}

