import { describe, it, expect } from 'vitest'
import { mustCall, mustSucceed } from '../common/index.ts'
import { Duplex, Readable, Writable, pipeline, PassThrough } from 'readable-stream'

function makeATestReadableStream(value: string) {
  return Readable.from([value])
}

function makeATestWritableStream(writeFunc: (chunk: unknown) => void) {
  return new Writable({
    write(chunk, _enc, cb) {
      writeFunc(chunk)
      cb()
    }
  })
}

describe('test-stream-duplex-from', () => {
  it('Duplex.from with readable option', () =>
    new Promise<void>(resolve => {
      const d = Duplex.from({
        readable: new Readable({
          read() {
            this.push('asd')
            this.push(null)
          }
        })
      })
      expect(d.readable).toBe(true)
      expect(d.writable).toBe(false)
      d.once(
        'readable',
        mustCall(function () {
          expect(d.read().toString()).toBe('asd')
        }) as (...args: unknown[]) => void
      )
      d.once(
        'end',
        mustCall(function () {
          expect(d.readable).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with Readable instance', () =>
    new Promise<void>(resolve => {
      const d = Duplex.from(
        new Readable({
          read() {
            this.push('asd')
            this.push(null)
          }
        })
      )
      expect(d.readable).toBe(true)
      expect(d.writable).toBe(false)
      d.once(
        'readable',
        mustCall(function () {
          expect(d.read().toString()).toBe('asd')
        }) as (...args: unknown[]) => void
      )
      d.once(
        'end',
        mustCall(function () {
          expect(d.readable).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with Writable instance', () =>
    new Promise<void>(resolve => {
      let ret = ''
      const d = Duplex.from(
        new Writable({
          write(chunk, _encoding, callback) {
            ret += chunk
            callback()
          }
        })
      )
      expect(d.readable).toBe(false)
      expect(d.writable).toBe(true)
      d.end('asd')
      d.on(
        'finish',
        mustCall(function () {
          expect(d.writable).toBe(false)
          expect(ret).toBe('asd')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with writable option', () =>
    new Promise<void>(resolve => {
      let ret = ''
      const d = Duplex.from({
        writable: new Writable({
          write(chunk, _encoding, callback) {
            ret += chunk
            callback()
          }
        })
      })
      expect(d.readable).toBe(false)
      expect(d.writable).toBe(true)
      d.end('asd')
      d.on(
        'finish',
        mustCall(function () {
          expect(d.writable).toBe(false)
          expect(ret).toBe('asd')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with both readable and writable options', () =>
    new Promise<void>(resolve => {
      let ret = ''
      let endCount = 0
      const d = Duplex.from({
        readable: new Readable({
          read() {
            this.push('asd')
            this.push(null)
          }
        }),
        writable: new Writable({
          write(chunk, _encoding, callback) {
            ret += chunk
            callback()
          }
        })
      })
      expect(d.readable).toBe(true)
      expect(d.writable).toBe(true)
      d.once(
        'readable',
        mustCall(function () {
          expect(d.read().toString()).toBe('asd')
        }) as (...args: unknown[]) => void
      )
      d.once(
        'end',
        mustCall(function () {
          expect(d.readable).toBe(false)
          if (++endCount === 2) {
            resolve()
          }
        }) as (...args: unknown[]) => void
      )
      d.end('asd')
      d.once(
        'finish',
        mustCall(function () {
          expect(d.writable).toBe(false)
          expect(ret).toBe('asd')
          if (++endCount === 2) {
            resolve()
          }
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with Promise', () =>
    new Promise<void>(resolve => {
      const d = Duplex.from(Promise.resolve('asd'))
      expect(d.readable).toBe(true)
      expect(d.writable).toBe(false)
      d.once(
        'readable',
        mustCall(function () {
          expect(d.read().toString()).toBe('asd')
        }) as (...args: unknown[]) => void
      )
      d.once(
        'end',
        mustCall(function () {
          expect(d.readable).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with async generator (pipeline)', () =>
    new Promise<void>(resolve => {
      pipeline(
        ['abc\ndef\nghi'],
        // @ts-ignore - Duplex.from accepts async generator function at runtime
        Duplex.from(async function* (source: AsyncIterable<string>) {
          let rest = ''
          for await (const chunk of source) {
            const lines = (rest + chunk.toString()).split('\n')
            rest = lines.pop()!
            for (const line of lines) {
              yield line
            }
          }
          yield rest
        }),
        async function* (source: AsyncIterable<string>) {
          let ret = ''
          for await (const x of source) {
            ret += x
          }
          expect(ret).toBe('abcdefghi')
        },
        mustSucceed(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with existing Duplex returns same instance', () => {
    const duplex = new Duplex()
    expect(Duplex.from(duplex)).toBe(duplex)
  })

  it('Duplex.from with Blob', () =>
    new Promise<void>(resolve => {
      if (typeof Blob === 'undefined') {
        resolve()
        return
      }
      const blob = new Blob(['blob'])
      const expectedByteLength = blob.size
      const duplex = Duplex.from(blob)
      duplex.on(
        'data',
        mustCall((arrayBuffer: Buffer) => {
          expect(arrayBuffer.byteLength).toBe(expectedByteLength)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with rejected Promise emits error', () =>
    new Promise<void>(resolve => {
      const myErrorMessage = 'myCustomError'
      Duplex.from(Promise.reject(myErrorMessage)).on(
        'error',
        mustCall((error: unknown) => {
          expect(error).toBe(myErrorMessage)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with async function rejection emits error', () =>
    new Promise<void>(resolve => {
      const myErrorMessage = 'myCustomError'
      async function asyncFn() {
        return Promise.reject(myErrorMessage)
      }
      // @ts-ignore - Duplex.from accepts async function at runtime
      Duplex.from(asyncFn).on(
        'error',
        mustCall((error: unknown) => {
          expect(error).toBe(myErrorMessage)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with void function throws', () => {
    expect(() => Duplex.from((() => {}) as any)).toThrow()
  })

  it('Duplex.from with sub-object readable stream', () =>
    new Promise<void>(resolve => {
      const msg = Buffer.from('hello')
      const duplex = Duplex.from({
        readable: new Readable({
          read() {
            this.push(msg)
            this.push(null)
          }
        })
      }).on(
        'data',
        mustCall((data: Buffer) => {
          expect(data).toBe(msg)
          resolve()
        }) as (...args: unknown[]) => void
      )
      expect(duplex.writable).toBe(false)
    }))

  it('Duplex.from with sub-object writable stream', () => {
    const msg = Buffer.from('hello')
    const duplex = Duplex.from({
      writable: new Writable({
        write: mustCall((data: Buffer) => {
          expect(data).toBe(msg)
        }) as (...args: unknown[]) => void as (
          chunk: unknown,
          encoding: string,
          cb: (err?: Error | null) => void
        ) => void
      })
    })
    duplex.write(msg)
    expect(duplex.readable).toBe(false)
  })

  it('Duplex.from with sub-object readable and writable stream', () =>
    new Promise<void>(resolve => {
      const msg = Buffer.from('hello')
      const duplex = Duplex.from({
        readable: new Readable({
          read() {
            this.push(msg)
            this.push(null)
          }
        }),
        writable: new Writable({
          write: mustCall((data: Buffer) => {
            expect(data).toBe(msg)
          }) as (...args: unknown[]) => void as (
            chunk: unknown,
            encoding: string,
            cb: (err?: Error | null) => void
          ) => void
        })
      })
      duplex
        .pipe(duplex)
        .on(
          'data',
          mustCall((data: Buffer) => {
            expect(data).toBe(msg)
            expect(duplex.readable).toBe(true)
            expect(duplex.writable).toBe(true)
          }) as (...args: unknown[]) => void
        )
        .on(
          'end',
          mustCall(() => {
            resolve()
          }) as (...args: unknown[]) => void
        )
    }))

  it('Duplex.from with readable stream that throws error', () =>
    new Promise<void>(resolve => {
      const myErrorMessage = 'error!'
      const duplex = Duplex.from(
        new Readable({
          read() {
            throw new Error(myErrorMessage)
          }
        })
      )
      duplex.on(
        'error',
        mustCall((msg: Error) => {
          expect(msg.message).toBe(myErrorMessage)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with writable stream that calls back with error', () =>
    new Promise<void>(resolve => {
      const myErrorMessage = 'error!'
      const duplex = Duplex.from(
        new Writable({
          write(_chunk, _enc, cb) {
            cb(myErrorMessage as unknown as Error)
          }
        })
      )
      duplex.on(
        'error',
        mustCall((msg: unknown) => {
          expect(msg).toBe(myErrorMessage)
          resolve()
        }) as (...args: unknown[]) => void
      )
      duplex.write('test')
    }))

  it('Duplex.from with PassThrough pipe', () =>
    new Promise<void>(resolve => {
      const through = new PassThrough({
        objectMode: true
      })
      let res = ''
      const d = Readable.from(['foo', 'bar'], {
        objectMode: true
      }).pipe(
        Duplex.from({
          writable: through,
          readable: through
        })
      )
      d.on('data', (data: unknown) => {
        d.pause()
        setImmediate(() => {
          d.resume()
        })
        res += data
      })
        .on(
          'end',
          mustCall(() => {
            expect(res).toBe('foobar')
          }) as (...args: unknown[]) => void
        )
        .on(
          'close',
          mustCall(() => {
            resolve()
          }) as (...args: unknown[]) => void
        )
    }))

  it('Duplex.from with Readable.from readable option', () =>
    new Promise<void>(resolve => {
      const d = Duplex.from({
        readable: makeATestReadableStream('foo')
      })
      expect(d.readable).toBe(true)
      expect(d.writable).toBe(false)
      d.on(
        'data',
        mustCall((data: Buffer) => {
          expect(data.toString()).toBe('foo')
        }) as (...args: unknown[]) => void
      )
      d.on(
        'end',
        mustCall(() => {
          expect(d.readable).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with Readable.from directly', () =>
    new Promise<void>(resolve => {
      const d = Duplex.from(makeATestReadableStream('foo'))
      expect(d.readable).toBe(true)
      expect(d.writable).toBe(false)
      d.on(
        'data',
        mustCall((data: Buffer) => {
          expect(data.toString()).toBe('foo')
        }) as (...args: unknown[]) => void
      )
      d.on(
        'end',
        mustCall(() => {
          expect(d.readable).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with writable test stream option', () =>
    new Promise<void>(resolve => {
      let ret = ''
      const d = Duplex.from({
        writable: makeATestWritableStream(chunk => (ret += chunk))
      })
      expect(d.readable).toBe(false)
      expect(d.writable).toBe(true)
      d.end('foo')
      d.on(
        'finish',
        mustCall(() => {
          expect(ret).toBe('foo')
          expect(d.writable).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with writable test stream directly', () =>
    new Promise<void>(resolve => {
      let ret = ''
      const d = Duplex.from(makeATestWritableStream(chunk => (ret += chunk)))
      expect(d.readable).toBe(false)
      expect(d.writable).toBe(true)
      d.end('foo')
      d.on(
        'finish',
        mustCall(() => {
          expect(ret).toBe('foo')
          expect(d.writable).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Duplex.from with readable and writable test streams', () =>
    new Promise<void>(resolve => {
      let ret = ''
      let doneCount = 0
      const d = Duplex.from({
        readable: makeATestReadableStream('foo'),
        writable: makeATestWritableStream(chunk => (ret += chunk))
      })
      d.end('bar')
      d.on(
        'data',
        mustCall((data: Buffer) => {
          expect(data.toString()).toBe('foo')
        }) as (...args: unknown[]) => void
      )
      d.on(
        'end',
        mustCall(() => {
          expect(d.readable).toBe(false)
          if (++doneCount === 2) {
            resolve()
          }
        }) as (...args: unknown[]) => void
      )
      d.on(
        'finish',
        mustCall(() => {
          expect(ret).toBe('bar')
          expect(d.writable).toBe(false)
          if (++doneCount === 2) {
            resolve()
          }
        }) as (...args: unknown[]) => void
      )
    }))
})
