/**
 * timers browser tests
 */

import { describe, expect, it } from 'vitest'
import {
  clearImmediate,
  clearInterval,
  clearTimeout,
  setImmediate,
  setInterval,
  setTimeout,
  active,
  unenroll,
  enroll
} from './timers.ts'
import {
  setTimeout as setTimeoutP,
  setImmediate as setImmediateP,
  setInterval as setIntervalP,
  scheduler
} from './timers_promises.ts'

describe('setTimeout / clearTimeout', () => {
  it('should execute callback after delay', async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 10)
    })
  })

  it('should pass arguments to callback', async () => {
    await new Promise<void>(resolve => {
      setTimeout(
        (a: string, b: string) => {
          expect(a).toBe('x')
          expect(b).toBe('y')
          resolve()
        },
        10,
        'x',
        'y'
      )
    })
  })

  it('clearTimeout should cancel timer', async () => {
    let called = false
    const id = setTimeout(() => {
      called = true
    }, 10)
    clearTimeout(id)
    await new Promise(r => globalThis.setTimeout(r, 30))
    expect(called).toBe(false)
  })
})

describe('setInterval / clearInterval', () => {
  it('should execute callback repeatedly', async () => {
    let count = 0
    const id = setInterval(() => {
      count++
    }, 10)
    await new Promise(r => globalThis.setTimeout(r, 55))
    clearInterval(id)
    expect(count).toBeGreaterThanOrEqual(2)
  })
})

describe('setImmediate / clearImmediate', () => {
  it('should execute callback asynchronously', async () => {
    const order: number[] = []
    setImmediate(() => order.push(2))
    order.push(1)
    await new Promise(r => globalThis.setTimeout(r, 20))
    expect(order).toEqual([1, 2])
  })

  it('should pass arguments', async () => {
    const result = await new Promise<string[]>(resolve => {
      setImmediate((...args: unknown[]) => resolve(args as string[]), 'a', 'b')
    })
    expect(result).toEqual(['a', 'b'])
  })

  it('clearImmediate should cancel', async () => {
    let called = false
    const id = setImmediate(() => {
      called = true
    })
    clearImmediate(id)
    await new Promise(r => globalThis.setTimeout(r, 20))
    expect(called).toBe(false)
  })
})

describe('deprecated stubs', () => {
  it('active should not throw', () => {
    expect(() => active()).not.toThrow()
  })

  it('unenroll should not throw', () => {
    expect(() => unenroll()).not.toThrow()
  })

  it('enroll should not throw', () => {
    expect(() => enroll()).not.toThrow()
  })
})

describe('promises.setTimeout', () => {
  it('should resolve after delay', async () => {
    const start = Date.now()
    await setTimeoutP(20)
    expect(Date.now() - start).toBeGreaterThanOrEqual(15)
  })

  it('should resolve with value', async () => {
    const result = await setTimeoutP(10, 'hello')
    expect(result).toBe('hello')
  })

  it('should reject on AbortSignal', async () => {
    const ac = new AbortController()
    const p = setTimeoutP(1000, undefined, { signal: ac.signal })
    ac.abort()
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('should reject immediately if already aborted', async () => {
    await expect(
      setTimeoutP(1000, undefined, { signal: AbortSignal.abort() })
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('promises.setImmediate', () => {
  it('should resolve immediately', async () => {
    const result = await setImmediateP(42)
    expect(result).toBe(42)
  })

  it('should reject on AbortSignal', async () => {
    await expect(setImmediateP(undefined, { signal: AbortSignal.abort() })).rejects.toMatchObject({
      name: 'AbortError'
    })
  })
})

describe('promises.setInterval', () => {
  it('should yield values', async () => {
    const values: unknown[] = []
    const iter = setIntervalP(10)
    for await (const v of iter) {
      values.push(v)
      if (values.length === 3) break
    }
    expect(values).toHaveLength(3)
  })

  it('should stop on AbortSignal', async () => {
    const ac = new AbortController()
    const iter = setIntervalP(10, 'tick', { signal: ac.signal })
    const first = await iter.next()
    expect(first.done).toBe(false)
    ac.abort()
    const last = await iter.next()
    expect(last.done).toBe(true)
  })

  it('should be done if signal already aborted', async () => {
    const iter = setIntervalP(10, undefined, { signal: AbortSignal.abort() })
    const result = await iter.next()
    expect(result.done).toBe(true)
  })
})

describe('scheduler', () => {
  it('wait should resolve after delay', async () => {
    const start = Date.now()
    await scheduler.wait(20)
    expect(Date.now() - start).toBeGreaterThanOrEqual(15)
  })

  it('yield should resolve asynchronously', async () => {
    const order: number[] = []
    const p = scheduler.yield().then(() => order.push(2))
    order.push(1)
    await p
    expect(order).toEqual([1, 2])
  })
})
