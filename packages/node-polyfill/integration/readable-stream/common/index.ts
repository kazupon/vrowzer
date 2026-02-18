/**
 * Test helpers for readable-stream tests (vitest adaptation)
 *
 * Adapted from https://github.com/nodejs/readable-stream/test/common/index.js
 * Provides mustCall, mustNotCall, mustSucceed, expectsError, etc.
 */

import { afterEach, expect } from 'vitest'

const noop = () => {}

interface MustCallContext {
  exact?: number
  minimum?: number
  actual: number
  name: string
}

const mustCallChecks: MustCallContext[] = []

afterEach(() => {
  const failed = mustCallChecks.filter(context => {
    if ('minimum' in context && context.minimum !== undefined) {
      return context.actual < context.minimum
    }
    return context.actual !== context.exact
  })
  // Always clear the checks array, even if assertions fail below.
  // Otherwise, stale entries bleed into subsequent tests.
  mustCallChecks.length = 0
  for (const context of failed) {
    const expected =
      'minimum' in context ? `at least ${context.minimum}` : `exactly ${context.exact}`
    expect.unreachable(
      `Mismatched function calls for "${context.name}". Expected ${expected}, actual ${context.actual}.`
    )
  }
})

function _mustCallInner(
  fn: Function | number | undefined,
  criteria: number | undefined = 1,
  field: 'exact' | 'minimum'
): Function {
  if (typeof fn === 'number') {
    criteria = fn
    fn = noop
  } else if (fn === undefined) {
    fn = noop
  }
  if (typeof criteria !== 'number') {
    throw new TypeError(`Invalid ${field} value: ${criteria}`)
  }

  const context: MustCallContext = {
    [field]: criteria,
    actual: 0,
    name: fn.name || '<anonymous>'
  }
  mustCallChecks.push(context)

  const _return = function (this: unknown, ...args: unknown[]) {
    context.actual++
    return fn.apply(this, args)
  }

  Object.defineProperties(_return, {
    name: { value: fn.name, writable: false, enumerable: false, configurable: true },
    length: { value: fn.length, writable: false, enumerable: false, configurable: true }
  })

  return _return
}

export function mustCall(fn?: Function | number, exact?: number): Function {
  return _mustCallInner(fn, exact, 'exact')
}

export function mustSucceed(fn?: Function | number, exact?: number): Function {
  return mustCall(function (this: unknown, err: unknown, ...args: unknown[]) {
    expect(err).toBeFalsy()
    if (typeof fn === 'function') {
      return fn.apply(this, args)
    }
  }, exact)
}

export function mustCallAtLeast(fn?: Function | number, minimum?: number): Function {
  return _mustCallInner(fn, minimum, 'minimum')
}

export function mustNotCall(msg?: string): Function {
  return function mustNotCall(...args: unknown[]) {
    const argsInfo =
      args.length > 0 ? `\ncalled with arguments: ${args.map(a => String(a)).join(', ')}` : ''
    expect.unreachable(`${msg || 'function should not have been called'}${argsInfo}`)
  }
}

export function expectsError(
  validator: { code?: string; name?: string; message?: string | RegExp } | Function,
  exact?: number
): Function {
  return mustCall((...args: unknown[]) => {
    expect(args).toHaveLength(1)
    const error = args[0] as Error & { code?: string }
    if (typeof validator === 'function') {
      validator(error)
    } else {
      if (validator.code) {
        expect(error.code).toBe(validator.code)
      }
      if (validator.name) {
        expect(error.name).toBe(validator.name)
      }
      if (validator.message) {
        if (validator.message instanceof RegExp) {
          expect(error.message).toMatch(validator.message)
        } else {
          expect(error.message).toBe(validator.message)
        }
      }
    }
    return true
  }, exact)
}

/**
 * Asserts that `fn` throws an error with the given error code.
 * readable-stream errors have a `.code` property but the error code
 * is NOT included in the `.message` string, so `.toThrow(/ERR_CODE/)`
 * won't work. This helper checks `.code` directly.
 */
export function assertThrowsCode(fn: () => unknown, code: string): void {
  try {
    fn()
    expect.unreachable(`Expected function to throw with code ${code}`)
  } catch (err) {
    expect((err as Error & { code?: string }).code).toBe(code)
  }
}

/**
 * Asserts that `fn` (async) rejects with an error matching the given code.
 */
export async function assertRejectsCode(fn: () => Promise<unknown>, code: string): Promise<void> {
  try {
    await fn()
    expect.unreachable(`Expected function to reject with code ${code}`)
  } catch (err) {
    expect((err as Error & { code?: string }).code).toBe(code)
  }
}

export { noop }
export const isWindows = false
export const isLinux = false
export const isOSX = false
