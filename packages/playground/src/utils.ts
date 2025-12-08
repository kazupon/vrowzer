import path from 'pathe'

const windowsSlashRE = /\\/g
function slash(p: string): string {
  return p.replace(windowsSlashRE, '/')
}

const importQueryRE = /(\?|&)import=?(?:&|$)/
const trailingSeparatorRE = /[?&]$/

export function removeImportQuery(url: string): string {
  return url.replace(importQueryRE, '$1').replace(trailingSeparatorRE, '')
}

const timestampRE = /\bt=\d{13}&?\b/
export function removeTimestampQuery(url: string): string {
  return url.replace(timestampRE, '').replace(trailingSeparatorRE, '')
}

const isWindows: boolean = typeof process !== 'undefined' && process.platform === 'win32'

export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id)
}

const postfixRE = /[?#].*$/
export function cleanUrl(url: string): string {
  return url.replace(postfixRE, '')
}

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
