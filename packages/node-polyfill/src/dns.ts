/**
 * `node:dns` compatible entry point
 *
 * All APIs are stubs since DNS resolution is not available in browsers.
 * Callback-based APIs invoke the callback asynchronously with stub values.
 * Promise-based APIs resolve with stub values.
 *
 * @module dns
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

export const NODATA = 'ENODATA'
export const FORMERR = 'EFORMERR'
export const SERVFAIL = 'ESERVFAIL'
export const NOTFOUND = 'ENOTFOUND'
export const NOTIMP = 'ENOTIMP'
export const REFUSED = 'EREFUSED'
export const BADQUERY = 'EBADQUERY'
export const BADNAME = 'EBADNAME'
export const BADFAMILY = 'EBADFAMILY'
export const BADRESP = 'EBADRESP'
export const CONNREFUSED = 'ECONNREFUSED'
export const TIMEOUT = 'ETIMEOUT'
export const EOF = 'EOF'
export const FILE = 'EFILE'
export const NOMEM = 'ENOMEM'
export const DESTRUCTION = 'EDESTRUCTION'
export const BADSTR = 'EBADSTR'
export const BADFLAGS = 'EBADFLAGS'
export const NONAME = 'ENONAME'
export const BADHINTS = 'EBADHINTS'
export const NOTINITIALIZED = 'ENOTINITIALIZED'
export const LOADIPHLPAPI = 'ELOADIPHLPAPI'
export const ADDRGETNETWORKPARAMS = 'EADDRGETNETWORKPARAMS'
export const CANCELLED = 'ECANCELLED'

export const ADDRCONFIG = 0
export const ALL = 1
export const V4MAPPED = 2

type Callback = (...args: unknown[]) => void

interface LookupOptions {
  family?: number | string
  hints?: number
  all?: boolean
  verbatim?: boolean
  order?: string
}

const _empty: unknown[] = []
const _emptyP = Promise.resolve(_empty)
const _loopback = { address: '127.0.0.1', family: 4 }

function _tick(fn: Callback, ...args: unknown[]): void {
  queueMicrotask(() => fn(...args))
}

function _cbEmpty(_h: string, cb: Callback): void {
  _tick(cb, null, _empty)
}

function _pEmpty(): Promise<unknown[]> {
  return _emptyP
}

// resolve* method names shared across Resolver / PromiseResolver / promises
const RESOLVE_NAMES = [
  'resolveAny',
  'resolveCaa',
  'resolveCname',
  'resolveMx',
  'resolveNaptr',
  'resolveNs',
  'resolvePtr',
  'resolveSoa',
  'resolveSrv',
  'resolveTlsa',
  'resolveTxt'
] as const

let _resultOrder = 'verbatim'

export function getServers(): string[] {
  return []
}

export function setServers(_servers: string[]): void {}

export function getDefaultResultOrder(): string {
  return _resultOrder
}

export function setDefaultResultOrder(order: string): void {
  _resultOrder = order
}

export function lookup(
  _hostname: string,
  optionsOrCallback?: LookupOptions | Callback,
  callback?: Callback
): void {
  const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback
  const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {}
  if (!cb) {
    return
  }
  if (options?.all) {
    _tick(cb, null, [_loopback])
  } else {
    _tick(cb, null, _loopback.address, _loopback.family)
  }
}

export function lookupService(_address: string, _port: number, callback: Callback): void {
  _tick(callback, null, 'localhost', '')
}

export function resolve(
  _hostname: string,
  rrtypeOrCallback?: string | Callback,
  callback?: Callback
): void {
  const cb = typeof rrtypeOrCallback === 'function' ? rrtypeOrCallback : callback
  if (cb) {
    _tick(cb, null, _empty)
  }
}

export function resolve4(
  _hostname: string,
  optionsOrCallback?: object | Callback,
  callback?: Callback
): void {
  const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback
  if (cb) {
    // @ts-expect-error -- ignore
    _tick(cb, null, _empty)
  }
}

export function resolve6(
  _hostname: string,
  optionsOrCallback?: object | Callback,
  callback?: Callback
): void {
  const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback
  if (cb) {
    // @ts-expect-error -- ignore
    _tick(cb, null, _empty)
  }
}

export {
  _cbEmpty as resolveAny,
  _cbEmpty as resolveCaa,
  _cbEmpty as resolveCname,
  _cbEmpty as resolveMx,
  _cbEmpty as resolveNaptr,
  _cbEmpty as resolveNs,
  _cbEmpty as resolvePtr,
  _cbEmpty as resolveSoa,
  _cbEmpty as resolveSrv,
  _cbEmpty as resolveTlsa,
  _cbEmpty as resolveTxt
}

export function reverse(_ip: string, callback: Callback): void {
  _tick(callback, null, _empty)
}

export class Resolver {
  cancel(): void {}
  setLocalAddress(_ipv4: string, _ipv6?: string): void {}
  getServers(): string[] {
    return []
  }
  setServers(_servers: string[]): void {}

  resolve(h: string, rOrCb?: string | Callback, cb?: Callback): void {
    resolve(h, rOrCb, cb)
  }
  resolve4(h: string, oOrCb?: object | Callback, cb?: Callback): void {
    resolve4(h, oOrCb, cb)
  }
  resolve6(h: string, oOrCb?: object | Callback, cb?: Callback): void {
    resolve6(h, oOrCb, cb)
  }
  reverse(ip: string, cb: Callback): void {
    reverse(ip, cb)
  }
}

// Attach resolve* methods to Resolver prototype via shared stub
for (const name of RESOLVE_NAMES) {
  // @ts-expect-error -- ignore
  ;(Resolver.prototype as Record<string, Function>)[name] = _cbEmpty
}

class PromiseResolver {
  cancel(): void {}
  setLocalAddress(_ipv4: string, _ipv6?: string): void {}
  getServers(): string[] {
    return []
  }
  setServers(_servers: string[]): void {}

  resolve(): Promise<unknown[]> {
    return _emptyP
  }
  resolve4(): Promise<unknown[]> {
    return _emptyP
  }
  resolve6(): Promise<unknown[]> {
    return _emptyP
  }
  reverse(): Promise<unknown[]> {
    return _emptyP
  }
}

// Attach resolve* methods to PromiseResolver prototype via shared stub
for (const name of RESOLVE_NAMES) {
  // @ts-expect-error -- ignore
  ;(PromiseResolver.prototype as Record<string, Function>)[name] = _pEmpty
}

export const promises = {
  lookup(
    _hostname: string,
    _options?: LookupOptions
  ): Promise<{ address: string; family: number } | Array<{ address: string; family: number }>> {
    return Promise.resolve(_options?.all ? [_loopback] : _loopback)
  },

  lookupService(): Promise<{ hostname: string; service: string }> {
    return Promise.resolve({ hostname: 'localhost', service: '' })
  },

  resolve: _pEmpty,
  resolve4: _pEmpty,
  resolve6: _pEmpty,
  reverse: _pEmpty,

  getServers,
  setServers,
  getDefaultResultOrder,
  setDefaultResultOrder,
  Resolver: PromiseResolver
} as Record<string, unknown>

// Attach resolve* methods to promises object via shared stub
for (const name of RESOLVE_NAMES) {
  promises[name] = _pEmpty
}
