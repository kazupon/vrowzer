import type { RolldownBinding } from '../bundler.ts'

let _fs: typeof import('node:fs') | undefined

export function _register(binding: RolldownBinding) {
  _fs = binding.__fs
}

export function _unregister() {
  _fs = undefined
}

const proxy = new Proxy(Object.create(null), {
  get(_, prop: keyof typeof import('node:fs')) {
    console.log('[fs polyfill] accessing fs property:', _, prop)
    if (_fs && prop in _fs) {
      return (_fs as any)[prop]
    }
    return (_ as any)[prop]
  }
}) as typeof import('node:fs')

export default proxy
