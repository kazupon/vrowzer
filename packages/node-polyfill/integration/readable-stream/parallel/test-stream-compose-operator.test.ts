import { describe, it, expect } from 'vitest'
import { mustCall, assertThrowsCode } from '../common/index.ts'
import { Readable, Transform } from 'readable-stream'

describe('test-stream-compose-operator', () => {
  it('compose with async generator', async () => {
    const stream = Readable.from(['a', 'b', 'c', 'd']).compose(async function* (
      stream: AsyncIterable<string>
    ) {
      let str = ''
      for await (const chunk of stream) {
        str += chunk
        if (str.length === 2) {
          yield str
          str = ''
        }
      }
    })
    const result = ['ab', 'cd']
    for await (const item of stream) {
      expect(item).toBe(result.shift())
    }
  })

  it('compose with Transformer', async () => {
    const stream = Readable.from(['a', 'b', 'c', 'd']).compose(
      new Transform({
        objectMode: true,
        transform: mustCall((chunk: string, _encoding: string, callback: Function) => {
          callback(null, chunk)
        }, 4) as (chunk: string, encoding: string, callback: Function) => void
      })
    )
    const result = ['a', 'b', 'c', 'd']
    for await (const item of stream) {
      expect(item).toBe(result.shift())
    }
  })

  it('throwing error during compose before waiting for data', async () => {
    const stream = Readable.from([1, 2, 3, 4, 5]).compose(async function* (
      _stream: AsyncIterable<number>
    ) {
      throw new Error('boom')
    })
    await expect(async () => {
      for await (const item of stream) {
        expect.unreachable('should not reach here, got ' + item)
      }
    }).rejects.toThrow(/boom/)
  })

  it('throwing error during compose when waiting for data', async () => {
    const stream = Readable.from([1, 2, 3, 4, 5]).compose(async function* (
      stream: AsyncIterable<number>
    ) {
      for await (const chunk of stream) {
        if (chunk === 3) {
          throw new Error('boom')
        }
        yield chunk
      }
    })
    await expect(stream.toArray()).rejects.toThrow(/boom/)
  })

  it('throwing error during compose after finishing all readable data', async () => {
    const stream = Readable.from([1, 2, 3, 4, 5]).compose(async function* (
      stream: AsyncIterable<number>
    ) {
      for await (const _chunk of stream) {
      }
      throw new Error('boom')
    })
    await expect(stream.toArray()).rejects.toThrow(/boom/)
  })

  it('AbortSignal', async () => {
    const ac = new AbortController()
    const stream = Readable.from([1, 2, 3, 4, 5]).compose(
      async function* (source: AsyncIterable<number>) {
        for await (const chunk of source) {
          yield chunk
        }
      },
      {
        signal: ac.signal
      }
    )
    ac.abort()
    await expect(async () => {
      for await (const item of stream) {
        expect.unreachable('should not reach here, got ' + item)
      }
    }).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('throws on composing with another Readable', () => {
    assertThrowsCode(
      () => Readable.from(['a']).compose(Readable.from(['b'])),
      'ERR_INVALID_ARG_VALUE'
    )
  })

  it('throws on compose with no arguments', () => {
    assertThrowsCode(() => (Readable.from(['a']).compose as Function)(), 'ERR_INVALID_ARG_TYPE')
  })
})
