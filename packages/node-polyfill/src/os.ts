/**
 * `node:os` compatible entry point
 *
 * Based on rollup-plugin-polyfill-node os.js polyfill, enhanced with
 * Node.js APIs that are missing from the original polyfill.
 * Browser-implementable APIs use real browser APIs where possible.
 * Node.js-specific APIs are provided as stubs.
 *
 * @module os
 */

/**
 * Forked from:
 * - rollup-plugin-polyfill-node (https://github.com/nicolo-ribaudo/rollup-plugin-polyfill-node)
 * - node:os (https://github.com/nodejs/node/tree/main/lib/os.js)
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

export function endianness(): 'BE' | 'LE' {
  const buffer = new ArrayBuffer(2)
  new DataView(buffer).setInt16(0, 256, true)
  return new Int16Array(buffer)[0] === 256 ? 'LE' : 'BE'
}

export function hostname(): string {
  if (typeof globalThis.location !== 'undefined') {
    return globalThis.location.hostname
  }
  return ''
}

export function loadavg(): [number, number, number] {
  return [0, 0, 0]
}

export function uptime(): number {
  return 0
}

export function freemem(): number {
  return Number.MAX_VALUE
}

export function totalmem(): number {
  return Number.MAX_VALUE
}

export function cpus(): object[] {
  return []
}

export function type(): string {
  return 'Browser'
}

export function release(): string {
  if (typeof navigator !== 'undefined' && navigator.appVersion) {
    return navigator.appVersion
  }
  return ''
}

export function networkInterfaces(): Record<string, never> {
  return {}
}

export function arch(): string {
  return 'javascript'
}

export function platform(): string {
  return 'browser'
}

export function tmpdir(): string {
  return '/tmp'
}

export function homedir(): string {
  return '/'
}

export const EOL = '\n'

export function availableParallelism(): number {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return navigator.hardwareConcurrency
  }
  return 1
}

export function version(): string {
  if (typeof navigator !== 'undefined' && navigator.appVersion) {
    return navigator.appVersion
  }
  return ''
}

export function machine(): string {
  if (typeof navigator !== 'undefined' && navigator.platform) {
    return navigator.platform
  }
  return 'unknown'
}

export const devNull = '/dev/null'

export const constants = Object.freeze({
  signals: Object.freeze({}),
  errno: Object.freeze({})
})

/**
 * Stub for `getPriority`.
 * Process priority is not available in browsers.
 */
export function getPriority(_pid?: number): number {
  return 0
}

/**
 * Stub for `setPriority`.
 * Process priority is not available in browsers.
 */
export function setPriority(_pidOrPriority?: number, _priority?: number): void {
  // no-op
}

interface UserInfo {
  uid: number
  gid: number
  username: string
  homedir: string
  shell: string | null
}

/**
 * Stub for `userInfo`.
 * User information is not available in browsers.
 */
export function userInfo(_options?: { encoding?: string }): UserInfo {
  return {
    uid: -1,
    gid: -1,
    username: '',
    homedir: '/',
    shell: null
  }
}
