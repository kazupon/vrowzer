import path from 'pathe'
import { NULL_BYTE_PLACEHOLDER, VALID_ID_PREFIX } from './constants.ts'

// --- shared---

const isWindows: boolean = typeof process !== 'undefined' && process.platform === 'win32'

/**
 * Prepend `/@id/` and replace null byte so the id is URL-safe.
 * This is prepended to resolved ids that are not valid browser
 * import specifiers by the importAnalysis plugin.
 */
function wrapId(id: string): string {
  return id.startsWith(VALID_ID_PREFIX)
    ? id
    : VALID_ID_PREFIX + id.replace('\0', NULL_BYTE_PLACEHOLDER)
}

/**
 * Undo {@link wrapId}'s `/@id/` and null byte replacements.
 */
function unwrapId(id: string): string {
  return id.startsWith(VALID_ID_PREFIX)
    ? id.slice(VALID_ID_PREFIX.length).replace(NULL_BYTE_PLACEHOLDER, '\0')
    : id
}

const windowsSlashRE = /\\/g
function slash(p: string): string {
  return p.replace(windowsSlashRE, '/')
}

const postfixRE = /[?#].*$/
export function cleanUrl(url: string): string {
  return url.replace(postfixRE, '')
}

function splitFileAndPostfix(path: string): {
  file: string
  postfix: string
} {
  const file = cleanUrl(path)
  return { file, postfix: path.slice(file.length) }
}

function isPrimitive(value: unknown): boolean {
  return !value || (typeof value !== 'object' && typeof value !== 'function')
}

export function withTrailingSlash(path: string): string {
  if (path[path.length - 1] !== '/') {
    return `${path}/`
  }
  return path
}

// --- utils.ts

/**
 * Inlined to keep `@rollup/pluginutils` in devDependencies
 */
// export type FilterPattern =
//   | ReadonlyArray<string | RegExp>
//   | string
//   | RegExp
//   | null
// export const createFilter = _createFilter as (
//   include?: FilterPattern,
//   exclude?: FilterPattern,
//   options?: { resolve?: string | false | null },
//   // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- FIXME(kazupon): remove redundant type constituents
// ) => (id: string | unknown) => boolean

const importQueryRE = /(\?|&)import=?(?:&|$)/
const trailingSeparatorRE = /[?&]$/

export function removeImportQuery(url: string): string {
  return url.replace(importQueryRE, '$1').replace(trailingSeparatorRE, '')
}

const timestampRE = /\bt=\d{13}&?\b/
export function removeTimestampQuery(url: string): string {
  return url.replace(timestampRE, '').replace(trailingSeparatorRE, '')
}

export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id)
}

const externalRE: RegExp = /^([a-z]+:)?\/\//
export const isExternalUrl = (url: string): boolean => externalRE.test(url)

let lastDateNow = 0
/**
 * Similar to `Date.now()`, but strictly monotonically increasing.
 *
 * This function will never return the same value.
 * Thus, the value may differ from the actual time.
 *
 * related: https://github.com/vitejs/vite/issues/19804
 */
export function monotonicDateNow(): number {
  const now = Date.now()
  if (now > lastDateNow) {
    lastDateNow = now
    return lastDateNow
  }

  lastDateNow++
  return lastDateNow
}
