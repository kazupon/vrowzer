import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-unshift', () => {
  it('unshift saves strings as Buffer', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        read() {}
      })
      const string = 'abc'
      readable.on(
        'data',
        mustCall((chunk: Buffer) => {
          expect(Buffer.isBuffer(chunk)).toBe(true)
          expect(chunk.toString('utf8')).toBe(string)
          resolve()
        }, 1) as (...args: unknown[]) => void
      )
      readable.unshift(string)
    }))

  it('unshift data goes at the beginning', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        read() {}
      })
      const unshift = 'front'
      const push = 'back'
      const expected = [unshift, push]
      let count = 0
      readable.on(
        'data',
        mustCall((chunk: Buffer) => {
          expect(chunk.toString('utf8')).toBe(expected.shift())
          count++
          if (count === 2) {
            resolve()
          }
        }, 2) as (...args: unknown[]) => void
      )
      readable.push(push)
      readable.unshift(unshift)
    }))

  it('unshift with correct encoding', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        read() {}
      })
      const encoding: BufferEncoding = 'base64'
      const string = Buffer.from('abc').toString(encoding)
      readable.on(
        'data',
        mustCall((chunk: Buffer) => {
          expect(chunk.toString(encoding)).toBe(string)
          resolve()
        }, 1) as (...args: unknown[]) => void
      )
      // @ts-ignore - unshift accepts encoding at runtime
      readable.unshift(string, encoding)
    }))

  it('unshift with stream encoding via setEncoding', () =>
    new Promise<void>(resolve => {
      const streamEncoding: BufferEncoding = 'base64'
      const encodings: BufferEncoding[] = ['utf8', 'binary', 'hex', 'base64']
      const expected: { encoding: BufferEncoding; string: string }[] = []

      const r1 = new Readable({
        read() {}
      })
      r1.setEncoding(streamEncoding)

      let count = 0
      r1.on(
        'data',
        mustCall((chunk: string) => {
          const { encoding, string } = expected.pop()!
          // @ts-ignore - toString accepts encoding at runtime
          expect(chunk.toString(encoding as BufferEncoding)).toBe(string)
          count++
          if (count === encodings.length) {
            resolve()
          }
        }, encodings.length) as (...args: unknown[]) => void
      )
      for (const encoding of encodings) {
        const string = 'abc'
        const exp =
          encoding !== streamEncoding
            ? Buffer.from(string, encoding).toString(streamEncoding)
            : string
        expected.push({
          encoding,
          string: exp
        })
        // @ts-ignore - unshift accepts encoding at runtime
        r1.unshift(string, encoding)
      }
    }))

  it('unshift with stream encoding via constructor', () =>
    new Promise<void>(resolve => {
      const streamEncoding: BufferEncoding = 'base64'
      const encodings: BufferEncoding[] = ['utf8', 'binary', 'hex', 'base64']
      const expected: { encoding: BufferEncoding; string: string }[] = []

      const r2 = new Readable({
        read() {},
        encoding: streamEncoding
      })

      let count = 0
      r2.on(
        'data',
        mustCall((chunk: string) => {
          const { encoding, string } = expected.pop()!
          // @ts-ignore - toString accepts encoding at runtime
          expect(chunk.toString(encoding as BufferEncoding)).toBe(string)
          count++
          if (count === encodings.length) {
            resolve()
          }
        }, encodings.length) as (...args: unknown[]) => void
      )
      for (const encoding of encodings) {
        const string = 'abc'
        const exp =
          encoding !== streamEncoding
            ? Buffer.from(string, encoding).toString(streamEncoding)
            : string
        expected.push({
          encoding,
          string: exp
        })
        // @ts-ignore - unshift accepts encoding at runtime
        r2.unshift(string, encoding)
      }
    }))

  it('push and unshift emit same encoding via setEncoding', () =>
    new Promise<void>(resolve => {
      const encoding: BufferEncoding = 'base64'
      const string = 'abc'

      const r1 = new Readable({
        read() {}
      })
      r1.setEncoding(encoding)

      let count = 0
      r1.on(
        'data',
        mustCall((chunk: string) => {
          expect(chunk).toBe(Buffer.from(string).toString(encoding))
          count++
          if (count === 2) {
            resolve()
          }
        }, 2) as (...args: unknown[]) => void
      )
      r1.push(string)
      r1.unshift(string)
    }))

  it('push and unshift emit same encoding via constructor', () =>
    new Promise<void>(resolve => {
      const encoding: BufferEncoding = 'base64'
      const string = 'abc'

      const r2 = new Readable({
        read() {},
        encoding
      })

      let count = 0
      r2.on(
        'data',
        mustCall((chunk: string) => {
          expect(chunk).toBe(Buffer.from(string).toString(encoding))
          count++
          if (count === 2) {
            resolve()
          }
        }, 2) as (...args: unknown[]) => void
      )
      r2.push(string)
      r2.unshift(string)
    }))

  it('unshift in objectMode', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        objectMode: true,
        read() {}
      })
      const chunks: unknown[] = ['a', 1, {}, []]
      const chunksClone = [...chunks]

      let count = 0
      readable.on(
        'data',
        mustCall((chunk: unknown) => {
          expect(chunk).toBe(chunksClone.pop())
          count++
          if (count === chunks.length) {
            resolve()
          }
        }, chunks.length) as (...args: unknown[]) => void
      )
      for (const chunk of chunks) {
        readable.unshift(chunk)
      }
    }))

  it('unshift above hwm should not throw', () =>
    new Promise<void>(resolve => {
      const highWaterMark = 50
      class ArrayReader extends Readable {
        buffer: string[]
        constructor() {
          super({
            highWaterMark
          })
          // The error happened only when pushing above hwm
          this.buffer = new Array(highWaterMark * 2).fill(0).map(String)
        }
        _read(_size: number) {
          while (this.buffer.length) {
            const chunk = this.buffer.shift()!
            if (!this.buffer.length) {
              this.push(chunk)
              this.push(null)
              return
            }
            if (!this.push(chunk)) {
              return
            }
          }
        }
      }

      const stream = new ArrayReader()

      function onRead() {
        while (null !== stream.read()) {
          // Remove the 'readable' listener before unshifting
          stream.removeListener('readable', onRead)
          stream.unshift('a')
          stream.on('data', () => {
            // consume
          })
          break
        }
      }

      stream.once('readable', mustCall(onRead) as (...args: unknown[]) => void)
      stream.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
