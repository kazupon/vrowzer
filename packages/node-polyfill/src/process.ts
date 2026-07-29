/**
 * `node:process` compatible entry point
 *
 * Based on rollup-plugin-polyfill-node process-es6.js polyfill, enhanced
 * with Node.js APIs. Browser-implementable APIs use real browser APIs
 * where possible. Node.js-specific APIs are provided as stubs.
 *
 * @module process
 */

/**
 * Forked from:
 * - rollup-plugin-polyfill-node (https://github.com/nicolo-ribaudo/rollup-plugin-polyfill-node)
 * - node:process (https://github.com/nodejs/node)
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

const _noop = (..._args: unknown[]): void => {}
const _startTime = Date.now()

const _queue: Array<{ fn: Function; args: unknown[] }> = []
let _draining = false

function _drainQueue(): void {
  if (_draining) {
    return
  }
  _draining = true
  let item = _queue.shift()
  while (item) {
    // oxlint-disable-next-line typescript/no-unsafe-call -- ignore for polyfill
    item.fn(...item.args)
    item = _queue.shift()
  }
  _draining = false
}

function nextTick(fn: Function, ...args: unknown[]): void {
  _queue.push({ fn, args })
  queueMicrotask(_drainQueue)
}

let _cwd = '/'

function cwd(): string {
  return _cwd
}

function chdir(directory: string): void {
  if (typeof directory !== 'string') {
    throw new TypeError(
      `The "directory" argument must be of type string. Received type ${typeof directory}`
    )
  }
  if (directory.startsWith('/')) {
    _cwd = directory
  } else {
    _cwd = _cwd === '/' ? `/${directory}` : `${_cwd}/${directory}`
  }
  // Normalize: remove trailing slash (except root), resolve . and ..
  _cwd = _cwd.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

function umask(_mask?: number): number {
  return 0
}

function binding(_name: string): never {
  throw new Error('process.binding is not supported in browser')
}

function hrtime(time?: [number, number]): [number, number] {
  const now = performance.now() * 1e-3
  let s = Math.floor(now)
  let ns = Math.round((now % 1) * 1e9)
  if (time) {
    s -= time[0]
    ns -= time[1]
    if (ns < 0) {
      s--
      ns += 1e9
    }
  }
  return [s, ns]
}

hrtime.bigint = (): bigint => {
  return BigInt(Math.round(performance.now() * 1e6))
}

function uptime(): number {
  return (Date.now() - _startTime) / 1000
}

const stdout = {
  isTTY: false,
  rows: 0,
  columns: 0,
  write: _noop,
  on: _noop,
  once: _noop,
  off: _noop,
  end: _noop
}

const stderr = {
  isTTY: false,
  rows: 0,
  columns: 0,
  write: _noop,
  on: _noop,
  once: _noop,
  off: _noop,
  end: _noop
}

const stdin = {
  isTTY: false,
  on: _noop,
  once: _noop,
  off: _noop,
  resume: _noop,
  pause: _noop
}

function memoryUsage(): {
  rss: number
  heapTotal: number
  heapUsed: number
  external: number
  arrayBuffers: number
} {
  const mem = (
    performance as unknown as {
      memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number }
    }
  ).memory
  if (mem) {
    return {
      rss: mem.usedJSHeapSize,
      heapTotal: mem.totalJSHeapSize,
      heapUsed: mem.usedJSHeapSize,
      external: 0,
      arrayBuffers: 0
    }
  }
  return { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }
}

memoryUsage.rss = (): number => 0

function cpuUsage(): { user: number; system: number } {
  return { user: 0, system: 0 }
}

function resourceUsage(): Record<string, number> {
  return {
    userCPUTime: 0,
    systemCPUTime: 0,
    maxRSS: 0,
    sharedMemorySize: 0,
    unsharedDataSize: 0,
    unsharedStackSize: 0,
    minorPageFault: 0,
    majorPageFault: 0,
    swappedOut: 0,
    fsRead: 0,
    fsWrite: 0,
    ipcSent: 0,
    ipcReceived: 0,
    signalsCount: 0,
    voluntaryContextSwitches: 0,
    involuntaryContextSwitches: 0
  }
}

function emitWarning(message: string, _type?: string): void {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(message)
  }
}

const process = {
  // rollup polyfill base
  title: 'browser',
  browser: true,
  platform: 'browser',
  env: {} as Record<string, string | undefined>,
  argv: [] as string[],
  version: '',
  versions: {} as Record<string, string>,
  release: {} as Record<string, string>,
  config: {} as Record<string, unknown>,
  nextTick,
  cwd,
  chdir,
  umask,
  binding,
  hrtime,
  uptime,
  on: _noop,
  once: _noop,
  off: _noop,
  emit: _noop,
  addListener: _noop,
  removeListener: _noop,
  removeAllListeners: _noop,
  prependListener: _noop,
  prependOnceListener: _noop,
  listeners: () => [],
  listenerCount: () => 0,

  // Node.js additions
  pid: 0,
  ppid: 0,
  exitCode: undefined as number | undefined,
  argv0: '',
  execPath: '',
  execArgv: [] as string[],
  arch: 'javascript',
  stdout,
  stderr,
  stdin,
  exit: _noop,
  kill: _noop,
  abort: _noop,
  memoryUsage,
  cpuUsage,
  resourceUsage,
  emitWarning,
  getuid: () => -1,
  getgid: () => -1,
  getgroups: () => [] as number[],
  debugPort: 9229,
  allowedNodeEnvironmentFlags: new Set<string>(),
  features: {} as Record<string, boolean>,
  noDeprecation: false,
  throwDeprecation: false,
  traceDeprecation: false
}

export default process
export {
  binding,
  chdir,
  cpuUsage,
  cwd,
  emitWarning,
  hrtime,
  memoryUsage,
  nextTick,
  resourceUsage,
  stderr,
  stdin,
  stdout,
  umask,
  uptime
}
