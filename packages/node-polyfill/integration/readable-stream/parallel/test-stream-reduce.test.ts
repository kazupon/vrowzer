import { describe, it, expect } from 'vitest'
import { mustCall, assertRejectsCode } from '../common/index.ts'
import { Readable } from 'readable-stream'

function sum(p: number, c: number) {
  return p + c
}

describe('test-stream-reduce', () => {
  it('does the same thing as array reduce', async () => {
    const tests: [unknown[], (p: unknown, c: unknown) => unknown, unknown?][] = [
      [[], sum as (p: unknown, c: unknown) => unknown, 0],
      [[1], sum as (p: unknown, c: unknown) => unknown, 0],
      [[1, 2, 3, 4, 5], sum as (p: unknown, c: unknown) => unknown, 0],
      [[...Array(100).keys()], sum as (p: unknown, c: unknown) => unknown, 0],
      [['a', 'b', 'c'], sum as (p: unknown, c: unknown) => unknown, ''],
      [[1, 2], sum as (p: unknown, c: unknown) => unknown],
      [[1, 2, 3], (_x: unknown, y: unknown) => y]
    ]
    for (const [values, fn, initial] of tests) {
      const streamReduce = await Readable.from(values).reduce(
        fn as (...args: unknown[]) => unknown,
        initial
      )
      const arrayReduce = (values as unknown[]).reduce(
        fn as (p: unknown, c: unknown) => unknown,
        initial
      )
      expect(streamReduce).toEqual(arrayReduce)
    }
  })

  it('does the same thing as array reduce with an asynchronous reducer', async () => {
    const tests: [unknown[], (p: unknown, c: unknown) => unknown, unknown?][] = [
      [[], sum as (p: unknown, c: unknown) => unknown, 0],
      [[1], sum as (p: unknown, c: unknown) => unknown, 0],
      [[1, 2, 3, 4, 5], sum as (p: unknown, c: unknown) => unknown, 0],
      [[...Array(100).keys()], sum as (p: unknown, c: unknown) => unknown, 0],
      [['a', 'b', 'c'], sum as (p: unknown, c: unknown) => unknown, ''],
      [[1, 2], sum as (p: unknown, c: unknown) => unknown],
      [[1, 2, 3], (_x: unknown, y: unknown) => y]
    ]
    for (const [values, fn, initial] of tests) {
      const streamReduce = await Readable.from(values)
        .map(async (x: unknown) => x)
        .reduce(fn as (...args: unknown[]) => unknown, initial)
      const arrayReduce = (values as unknown[]).reduce(
        fn as (p: unknown, c: unknown) => unknown,
        initial
      )
      expect(streamReduce).toEqual(arrayReduce)
    }
  })

  it('works with an async reducer, with initial value', async () => {
    // @ts-ignore - reduce overload mismatch
    const six = await Readable.from([1, 2, 3]).reduce(async (p: number, c: number) => p + c, 0)
    expect(six).toBe(6)
  })

  it('works with an async reducer, without initial value', async () => {
    const six = await Readable.from([1, 2, 3]).reduce(async (p: number, c: number) => p + c)
    expect(six).toBe(6)
  })

  it('works lazily', async () => {
    await expect(
      Readable.from([1, 2, 3, 4, 5, 6])
        .map(
          mustCall((x: unknown) => {
            return x
          }, 3) as (...args: unknown[]) => unknown
        )
        // @ts-ignore - reduce overload mismatch
        .reduce(async (p: number, c: number) => {
          if (p === 1) {
            throw new Error('boom')
          }
          return c
        }, 0)
    ).rejects.toThrow(/boom/)
  })

  it('support for AbortSignal', async () => {
    const ac = new AbortController()
    const rejectPromise = expect(
      (async () => {
        await Readable.from([1, 2, 3]).reduce(
          async (_p: unknown, c: number) => {
            if (c === 3) {
              await new Promise(() => {}) // Explicitly do not pass signal here
            }
            return Promise.resolve()
          },
          0,
          {
            signal: ac.signal
          }
        )
      })()
    ).rejects.toMatchObject({ name: 'AbortError' })
    ac.abort()
    await rejectPromise
  })

  it('support for AbortSignal - pre aborted', async () => {
    const stream = Readable.from([1, 2, 3])
    await expect(
      (async () => {
        await stream.reduce(
          async (_p: unknown, c: number) => {
            if (c === 3) {
              await new Promise(() => {}) // Explicitly do not pass signal here
            }
            return Promise.resolve()
          },
          0,
          {
            signal: AbortSignal.abort()
          }
        )
      })()
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(stream.destroyed).toBe(true)
  })

  it('support for AbortSignal - deep', async () => {
    const stream = Readable.from([1, 2, 3])
    await expect(
      (async () => {
        await (stream as any).reduce(
          async (_p: unknown, c: number, { signal }: { signal: AbortSignal }) => {
            signal.addEventListener('abort', mustCall() as (...args: unknown[]) => void, {
              once: true
            })
            if (c === 3) {
              await new Promise(() => {}) // Explicitly do not pass signal here
            }
            return Promise.resolve()
          },
          0,
          {
            signal: AbortSignal.abort()
          }
        )
      })()
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(stream.destroyed).toBe(true)
  })

  it('error cases', async () => {
    await assertRejectsCode(
      () => Readable.from([]).reduce(1 as unknown as () => unknown),
      'ERR_INVALID_ARG_TYPE'
    )
    await assertRejectsCode(
      () => Readable.from([]).reduce('5' as unknown as () => unknown),
      'ERR_INVALID_ARG_TYPE'
    )
    await assertRejectsCode(
      () =>
        Readable.from([]).reduce(
          (x: unknown, y: unknown) => (x as number) + (y as number),
          0,
          1 as unknown as object
        ),
      'ERR_INVALID_ARG_TYPE'
    )
    await assertRejectsCode(
      () =>
        Readable.from([]).reduce((x: unknown, y: unknown) => (x as number) + (y as number), 0, {
          signal: true
        } as unknown as object),
      'ERR_INVALID_ARG_TYPE'
    )
  })

  it('test result is a Promise', () => {
    const result = Readable.from([1, 2, 3, 4, 5]).reduce(sum as (...args: unknown[]) => unknown, 0)
    expect(result instanceof Promise).toBeTruthy()
  })
})
