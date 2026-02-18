import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall, assertThrowsCode } from '../common/index.ts'
import { Readable } from 'readable-stream'
import { once } from 'events'

describe('test-stream-filter', () => {
  it('filter works on synchronous streams with a synchronous predicate', async () => {
    const stream = Readable.from([1, 2, 3, 4, 5]).filter((x: number) => x < 3)
    const result = [1, 2]
    for await (const item of stream) {
      expect(item).toBe(result.shift())
    }
  })

  it('filter works on synchronous streams with an asynchronous predicate', async () => {
    const stream = Readable.from([1, 2, 3, 4, 5]).filter(async (x: number) => {
      await Promise.resolve()
      return x > 3
    })
    const result = [4, 5]
    for await (const item of stream) {
      expect(item).toBe(result.shift())
    }
  })

  it('map works on asynchronous streams with an asynchronous mapper', async () => {
    const stream = Readable.from([1, 2, 3, 4, 5])
      .map(async (x: number) => {
        await Promise.resolve()
        return x + x
      })
      .filter((x: number) => x > 5)
    const result = [6, 8, 10]
    for await (const item of stream) {
      expect(item).toBe(result.shift())
    }
  })

  it('filter works on an infinite stream', async () => {
    const stream = Readable.from(
      (async function* () {
        while (true) {
          yield 1
        }
      })()
    ).filter(
      // @ts-ignore - mustCall return type mismatch
      mustCall(async (x: number) => {
        return x < 3
      }, 5) as any
    )
    let i = 1
    for await (const item of stream) {
      expect(item).toBe(1)
      if (++i === 5) {
        break
      }
    }
  })

  it('filter works on constructor created streams', async () => {
    let i = 0
    const stream = new Readable({
      read() {
        if (i === 10) {
          this.push(null)
          return
        }
        this.push(Uint8Array.from([i]))
        i++
      },
      highWaterMark: 0
    }).filter(
      // @ts-ignore - mustCall return type mismatch
      mustCall(async ([x]: number[]) => {
        return x !== 5
      }, 10) as any
    )
    const result = (await stream.toArray()).map((x: Uint8Array) => x[0])
    const expected = [...Array(10).keys()].filter(x => x !== 5)
    expect(result).toEqual(expected)
  })

  it('throwing an error during filter (sync)', async () => {
    const stream = Readable.from([1, 2, 3, 4, 5]).filter((x: number) => {
      if (x === 3) {
        throw new Error('boom')
      }
      return true
    })
    await expect(stream.map((x: number) => x + x).toArray()).rejects.toThrow(/boom/)
  })

  it('throwing an error during filter (async)', async () => {
    const stream = Readable.from([1, 2, 3, 4, 5]).filter(async (x: number) => {
      if (x === 3) {
        throw new Error('boom')
      }
      return true
    })
    await expect(stream.filter(() => true).toArray()).rejects.toThrow(/boom/)
  })

  it('concurrency + AbortSignal', async () => {
    const ac = new AbortController()
    let calls = 0
    const stream = Readable.from([1, 2, 3, 4]).filter(
      // @ts-ignore - callback return type mismatch
      async (_: unknown, { signal }: { signal: AbortSignal }) => {
        calls++
        await once(signal, 'abort')
      },
      {
        signal: ac.signal,
        concurrency: 2
      }
    )
    const rejectPromise = expect(
      (async () => {
        for await (const _item of stream) {
          // nope
        }
      })()
    ).rejects.toMatchObject({ name: 'AbortError' })
    setImmediate(() => {
      ac.abort()
      expect(calls).toBe(2)
    })
    await rejectPromise
  })

  it('concurrency result order', async () => {
    const stream = Readable.from([1, 2]).filter(
      // @ts-ignore - callback signature mismatch
      async (item: number, { signal: _signal }: { signal: AbortSignal }) => {
        await new Promise<void>(resolve => setTimeout(resolve, 10 - item))
        return true
      },
      {
        concurrency: 2
      }
    )
    const expected = [1, 2]
    for await (const item of stream) {
      expect(item).toBe(expected.shift())
    }
  })

  it('error cases', () => {
    assertThrowsCode(
      () => Readable.from([1]).filter(1 as unknown as () => boolean),
      'ERR_INVALID_ARG_TYPE'
    )
    assertThrowsCode(
      () =>
        // @ts-ignore - testing invalid argument
        Readable.from([1]).filter((x: unknown) => x, {
          concurrency: 'Foo'
        } as unknown as object),
      'ERR_OUT_OF_RANGE'
    )
    assertThrowsCode(
      () =>
        Readable.from([1]).filter(
          ((x: unknown) => x) as (data: unknown) => boolean,
          1 as unknown as object
        ),
      'ERR_INVALID_ARG_TYPE'
    )
  })

  it('test result is a Readable', () => {
    const stream = Readable.from([1, 2, 3, 4, 5]).filter((_x: unknown) => true)
    expect(stream.readable).toBe(true)
  })

  it('filter does not call map internally', () => {
    const stream = Readable.from([1, 2, 3, 4, 5])
    Object.defineProperty(stream, 'map', {
      value: mustNotCall() as (...args: unknown[]) => unknown
    })
    // Check that map isn't getting called.
    stream.filter(() => true)
  })
})
