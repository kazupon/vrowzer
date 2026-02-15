/**
 * `node:timers` compatible entry point
 *
 * Core timer functions are re-exported from globalThis.
 * setImmediate/clearImmediate use MessageChannel fallback for browsers.
 *
 * @module timers
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

export const setTimeout = globalThis.setTimeout.bind(globalThis)
export const clearTimeout = globalThis.clearTimeout.bind(globalThis)
export const setInterval = globalThis.setInterval.bind(globalThis)
export const clearInterval = globalThis.clearInterval.bind(globalThis)

let _immediateId = 0
const _immediateCallbacks = new Map<number, boolean>()

export const setImmediate: (cb: (...args: unknown[]) => void, ...args: unknown[]) => number =
  typeof globalThis.setImmediate === 'function'
    ? (globalThis.setImmediate.bind(globalThis) as unknown as (
        cb: (...args: unknown[]) => void,
        ...args: unknown[]
      ) => number)
    : (cb: (...args: unknown[]) => void, ...args: unknown[]): number => {
        const id = ++_immediateId
        _immediateCallbacks.set(id, true)
        if (typeof MessageChannel !== 'undefined') {
          const channel = new MessageChannel()
          channel.port1.onmessage = () => {
            if (_immediateCallbacks.delete(id)) {
              cb(...args)
            }
          }
          channel.port2.postMessage(null)
        } else {
          globalThis.setTimeout(() => {
            if (_immediateCallbacks.delete(id)) {
              cb(...args)
            }
          }, 0)
        }
        return id
      }

export const clearImmediate: (id: number) => void =
  typeof globalThis.clearImmediate === 'function'
    ? globalThis.clearImmediate.bind(globalThis)
    : (id: number): void => {
        _immediateCallbacks.delete(id)
      }

export function active(..._args: unknown[]): void {}
export function unenroll(..._args: unknown[]): void {}
export function enroll(..._args: unknown[]): void {}
