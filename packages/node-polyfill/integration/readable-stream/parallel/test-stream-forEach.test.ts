import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall, assertRejectsCode } from '../common/index.ts'
import { Readable } from 'readable-stream'
import { once } from 'events'

describe('test-stream-forEach', () => {
  it('forEach works on synchronous streams with a synchronous predicate', async () => {
    const stream = Readable.from([1, 2, 3])
    const result = [1, 2, 3]
    await stream.forEach((value: number) => expect(value).toBe(result.shift()))
  })

  it('forEach works on asynchronous streams', async () => {
    const stream = Readable.from([1, 2, 3]).filter(async (_x: unknown) => {
      await Promise.resolve()
      return true
    })
    const result = [1, 2, 3]
    await stream.forEach((value: number) => expect(value).toBe(result.shift()))
  })

  it('forEach works on asynchronous streams with an asynchronous forEach fn', async () => {
    const stream = Readable.from([1, 2, 3]).filter(async (_x: unknown) => {
      await Promise.resolve()
      return true
    })
    const result = [1, 2, 3]
    await stream.forEach(async (value: number) => {
      await Promise.resolve()
      expect(value).toBe(result.shift())
    })
  })

  it('forEach works on an infinite stream', async () => {
    const ac = new AbortController()
    const { signal } = ac
    const stream = Readable.from(
      (async function* () {
        while (true) yield 1
      })(),
      {
        // @ts-ignore - signal exists at runtime
        signal
      }
    )
    let i = 0
    await expect(
      stream.forEach(
        mustCall((x: number) => {
          i++
          if (i === 10) ac.abort()
          expect(x).toBe(1)
        }, 10) as (...args: unknown[]) => void
      )
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('emitting an error during forEach', async () => {
    const stream = Readable.from([1, 2, 3, 4, 5])
    await expect(
      stream.forEach(async (x: number) => {
        if (x === 3) {
          stream.emit('error', new Error('boom'))
        }
      })
    ).rejects.toThrow(/boom/)
  })

  it('throwing an error during forEach (sync)', async () => {
    const stream = Readable.from([1, 2, 3, 4, 5])
    await expect(
      stream.forEach((x: number) => {
        if (x === 3) {
          throw new Error('boom')
        }
      })
    ).rejects.toThrow(/boom/)
  })

  it('throwing an error during forEach (async)', async () => {
    const stream = Readable.from([1, 2, 3, 4, 5])
    await expect(
      stream.forEach(async (x: number) => {
        if (x === 3) {
          return Promise.reject(new Error('boom'))
        }
      })
    ).rejects.toThrow(/boom/)
  })

  it('concurrency + AbortSignal', async () => {
    const ac = new AbortController()
    let calls = 0
    const forEachPromise = Readable.from([1, 2, 3, 4]).forEach(
      // @ts-ignore - callback signature mismatch
      async (_: unknown, { signal }: { signal: AbortSignal }) => {
        calls++
        await once(signal, 'abort')
      },
      {
        signal: ac.signal,
        concurrency: 2,
        highWaterMark: 0
      }
    )
    const rejectPromise = expect(
      (async () => {
        await forEachPromise
      })()
    ).rejects.toMatchObject({ name: 'AbortError' })
    setImmediate(() => {
      ac.abort()
      expect(calls).toBe(2)
    })
    await rejectPromise
  })

  it('error cases - invalid function', async () => {
    await assertRejectsCode(async () => {
      await Readable.from([1]).forEach(1 as unknown as () => void)
    }, 'ERR_INVALID_ARG_TYPE')
  })

  it('error cases - invalid concurrency', async () => {
    await assertRejectsCode(async () => {
      // @ts-ignore - testing invalid argument
      await Readable.from([1]).forEach((x: unknown) => x, {
        concurrency: 'Foo'
      } as unknown as object)
    }, 'ERR_OUT_OF_RANGE')
  })

  it('error cases - invalid options', async () => {
    await assertRejectsCode(async () => {
      // @ts-ignore - testing invalid argument
      await Readable.from([1]).forEach((x: unknown) => x, 1 as unknown as object)
    }, 'ERR_INVALID_ARG_TYPE')
  })

  it('test result is a Promise', () => {
    // @ts-ignore - forEach callback returns boolean not void
    const stream = Readable.from([1, 2, 3, 4, 5]).forEach((_: unknown) => true as any)
    expect(typeof (stream as unknown as { then: unknown }).then).toBe('function')
  })

  it('forEach does not call map internally', () => {
    const stream = Readable.from([1, 2, 3, 4, 5])
    Object.defineProperty(stream, 'map', {
      value: mustNotCall() as (...args: unknown[]) => unknown
    })
    // Check that map isn't getting called.
    // @ts-ignore - forEach callback returns boolean not void
    stream.forEach(() => true)
  })
})
