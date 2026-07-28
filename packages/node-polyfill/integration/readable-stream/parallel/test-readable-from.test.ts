import { describe, it, expect } from 'vite-plus/test'
import { mustCall, assertThrowsCode } from '../common/index.ts'
import { Readable } from 'readable-stream'
import { once } from 'events'

describe('test-readable-from', () => {
  it('throws on null', () => {
    assertThrowsCode(() => {
      Readable.from(null as any)
    }, 'ERR_INVALID_ARG_TYPE')
  })

  it('basic async generator support', async () => {
    async function* generate() {
      yield 'a'
      yield 'b'
      yield 'c'
    }
    const stream = Readable.from(generate())
    const expected = ['a', 'b', 'c']
    for await (const chunk of stream) {
      expect(chunk).toBe(expected.shift())
    }
  })

  it('sync iterator support', async () => {
    function* generate() {
      yield 'a'
      yield 'b'
      yield 'c'
    }
    const stream = Readable.from(generate())
    const expected = ['a', 'b', 'c']
    for await (const chunk of stream) {
      expect(chunk).toBe(expected.shift())
    }
  })

  it('promises support', async () => {
    const promises = [Promise.resolve('a'), Promise.resolve('b'), Promise.resolve('c')]
    const stream = Readable.from(promises)
    const expected = ['a', 'b', 'c']
    for await (const chunk of stream) {
      expect(chunk).toBe(expected.shift())
    }
  })

  it('string support', async () => {
    const stream = Readable.from('abc')
    const expected = ['abc']
    for await (const chunk of stream) {
      expect(chunk).toBe(expected.shift())
    }
  })

  it('buffer support', async () => {
    const stream = Readable.from(Buffer.from('abc'))
    const expected = ['abc']
    for await (const chunk of stream) {
      expect(chunk.toString()).toBe(expected.shift())
    }
  })

  it('on data event', async () => {
    async function* generate() {
      yield 'a'
      yield 'b'
      yield 'c'
    }
    const stream = Readable.from(generate())
    let iterations = 0
    const expected = ['a', 'b', 'c']
    stream.on('data', chunk => {
      iterations++
      expect(chunk).toBe(expected.shift())
    })
    await once(stream, 'end')
    expect(iterations).toBe(3)
  })

  it('on data non-object mode', async () => {
    async function* generate() {
      yield 'a'
      yield 'b'
      yield 'c'
    }
    const stream = Readable.from(generate(), {
      objectMode: false
    })
    let iterations = 0
    const expected = ['a', 'b', 'c']
    stream.on('data', chunk => {
      iterations++
      expect(chunk instanceof Buffer).toBe(true)
      expect(chunk.toString()).toBe(expected.shift())
    })
    await once(stream, 'end')
    expect(iterations).toBe(3)
  })

  it('destroys the stream when throwing', async () => {
    async function* generate() {
      throw new Error('kaboom')
    }
    const stream = Readable.from(generate())
    stream.read()
    const [err] = await once(stream, 'error')
    expect(err.message).toBe('kaboom')
    expect(stream.destroyed).toBe(true)
  })

  it('as transform stream', async () => {
    async function* generate(stream: AsyncIterable<string>) {
      for await (const chunk of stream) {
        yield chunk.toUpperCase()
      }
    }
    const source = new Readable({
      objectMode: true,
      read() {
        this.push('a')
        this.push('b')
        this.push('c')
        this.push(null)
      }
    })
    const stream = Readable.from(generate(source))
    const expected = ['A', 'B', 'C']
    for await (const chunk of stream) {
      expect(chunk).toBe(expected.shift())
    }
  })

  it('end with error', async () => {
    async function* generate() {
      yield 1
      yield 2
      yield Promise.reject('Boum')
    }
    const stream = Readable.from(generate())
    const expected = [1, 2]
    try {
      for await (const chunk of stream) {
        expect(chunk).toBe(expected.shift())
      }
      throw new Error()
    } catch (err) {
      expect(expected.length).toBe(0)
      expect(err).toBe('Boum')
    }
  })

  it('destroying stream with error throws in generator', () =>
    new Promise<void>(resolve => {
      const validateError = mustCall((e: unknown) => {
        expect(e).toBe('Boum')
      }) as (e: unknown) => void
      async function* generate() {
        try {
          yield 1
          yield 2
          yield 3
          throw new Error()
        } catch (e) {
          validateError(e)
        }
      }
      const stream = Readable.from(generate())
      stream.read()
      stream.once(
        'error',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      stream.destroy('Boum' as any)
    }))
})
