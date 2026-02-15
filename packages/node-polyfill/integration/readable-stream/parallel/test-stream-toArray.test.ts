import { describe, it, expect } from 'vitest'
import { assertRejectsCode } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-toArray', () => {
  it('works on a synchronous stream', async () => {
    const tests = [
      [],
      [1],
      [1, 2, 3],
      Array(100)
        .fill(undefined)
        .map((_, i) => i)
    ]
    for (const test of tests) {
      const stream = Readable.from(test)
      const result = await stream.toArray()
      expect(result).toEqual(test)
    }
  })

  it('works on a non-object-mode stream', async () => {
    const firstBuffer = Buffer.from([1, 2, 3])
    const secondBuffer = Buffer.from([4, 5, 6])
    const stream = Readable.from([firstBuffer, secondBuffer], {
      objectMode: false
    })
    const result = await stream.toArray()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toEqual([firstBuffer, secondBuffer])
  })

  it('works on an asynchronous stream', async () => {
    const tests = [
      [],
      [1],
      [1, 2, 3],
      Array(100)
        .fill(undefined)
        .map((_, i) => i)
    ]
    for (const test of tests) {
      const stream = Readable.from(test).map((x: number) => Promise.resolve(x))
      const result = await stream.toArray()
      expect(result).toEqual(test)
    }
  })

  it('support for AbortSignal', async () => {
    const ac = new AbortController()
    const stream = Readable.from([1, 2, 3]).map(async (x: number) => {
      if (x === 3) {
        await new Promise(() => {}) // Explicitly do not pass signal here
      }
      return Promise.resolve(x)
    })
    const promise = stream.toArray({
      signal: ac.signal
    })
    ac.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    // The original test uses assert(stream.destroyed, false) which
    // is assert.ok(stream.destroyed) - the second arg is just the message.
    // In readable-stream v4, the stream IS destroyed on abort.
    expect(stream.destroyed).toBe(true)
  })

  it('result is a Promise', () => {
    const result = Readable.from([1, 2, 3, 4, 5]).toArray()
    expect(result instanceof Promise).toBe(true)
  })

  it('error on invalid options argument', async () => {
    await assertRejectsCode(async () => {
      await Readable.from([1]).toArray(1 as any)
    }, 'ERR_INVALID_ARG_TYPE')
  })

  it('error on invalid signal option', async () => {
    await assertRejectsCode(async () => {
      await Readable.from([1]).toArray({
        signal: true
      } as any)
    }, 'ERR_INVALID_ARG_TYPE')
  })
})
