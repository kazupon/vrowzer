import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall, assertThrowsCode } from '../common/index.ts'
// @ts-ignore - compose exists at runtime but not in types
import { Readable, Transform, Writable, finished, PassThrough, compose } from 'readable-stream'

describe('test-stream-compose', () => {
  it('compose two transforms', () =>
    new Promise<void>(resolve => {
      let res = ''
      compose(
        new Transform({
          transform: mustCall((chunk: Buffer, _encoding: string, callback: Function) => {
            callback(null, chunk.toString() + chunk.toString())
          }) as (chunk: Buffer, encoding: string, callback: Function) => void
        }),
        new Transform({
          transform: mustCall((chunk: Buffer, _encoding: string, callback: Function) => {
            callback(null, chunk.toString().toUpperCase())
          }) as (chunk: Buffer, encoding: string, callback: Function) => void
        })
      )
        .end('asd')
        .on(
          'data',
          mustCall((buf: Buffer) => {
            res += buf
          }) as (...args: unknown[]) => void
        )
        .on(
          'end',
          mustCall(() => {
            expect(res).toBe('ASDASD')
            resolve()
          }) as (...args: unknown[]) => void
        )
    }))

  it('compose two async generators', () =>
    new Promise<void>(resolve => {
      let res = ''
      compose(
        async function* (source: AsyncIterable<string>) {
          for await (const chunk of source) {
            yield chunk + chunk
          }
        },
        async function* (source: AsyncIterable<string>) {
          for await (const chunk of source) {
            yield chunk.toString().toUpperCase()
          }
        }
      )
        .end('asd')
        .on(
          'data',
          mustCall((buf: Buffer) => {
            res += buf
          }) as (...args: unknown[]) => void
        )
        .on(
          'end',
          mustCall(() => {
            expect(res).toBe('ASDASD')
            resolve()
          }) as (...args: unknown[]) => void
        )
    }))

  it('compose single async generator', () =>
    new Promise<void>(resolve => {
      let res = ''
      compose(async function* (source: AsyncIterable<string>) {
        for await (const chunk of source) {
          yield chunk + chunk
        }
      })
        .end('asd')
        .on(
          'data',
          mustCall((buf: Buffer) => {
            res += buf
          }) as (...args: unknown[]) => void
        )
        .on(
          'end',
          mustCall(() => {
            expect(res).toBe('asdasd')
            resolve()
          }) as (...args: unknown[]) => void
        )
    }))

  it('compose Readable.from with transform', () =>
    new Promise<void>(resolve => {
      let res = ''
      compose(
        Readable.from(['asd']),
        new Transform({
          transform: mustCall((chunk: Buffer, _encoding: string, callback: Function) => {
            callback(null, chunk.toString().toUpperCase())
          }) as (chunk: Buffer, encoding: string, callback: Function) => void
        })
      )
        .on(
          'data',
          mustCall((buf: Buffer) => {
            res += buf
          }) as (...args: unknown[]) => void
        )
        .on(
          'end',
          mustCall(() => {
            expect(res).toBe('ASD')
            resolve()
          }) as (...args: unknown[]) => void
        )
    }))

  it('compose async iterator with transform', () =>
    new Promise<void>(resolve => {
      let res = ''
      compose(
        (async function* () {
          yield 'asd'
        })(),
        new Transform({
          transform: mustCall((chunk: Buffer, _encoding: string, callback: Function) => {
            callback(null, chunk.toString().toUpperCase())
          }) as (chunk: Buffer, encoding: string, callback: Function) => void
        })
      )
        .on(
          'data',
          mustCall((buf: Buffer) => {
            res += buf
          }) as (...args: unknown[]) => void
        )
        .on(
          'end',
          mustCall(() => {
            expect(res).toBe('ASD')
            resolve()
          }) as (...args: unknown[]) => void
        )
    }))

  it('compose transform, async generator, and writable', () =>
    new Promise<void>(resolve => {
      let res = ''
      compose(
        new Transform({
          transform: mustCall((chunk: Buffer, _encoding: string, callback: Function) => {
            callback(null, chunk.toString().toUpperCase())
          }) as (chunk: Buffer, encoding: string, callback: Function) => void
        }),
        async function* (source: AsyncIterable<string>) {
          for await (const chunk of source) {
            yield chunk
          }
        },
        new Writable({
          write: mustCall((chunk: Buffer, _encoding: string, callback: Function) => {
            res += chunk
            callback(null)
          }) as (chunk: Buffer, encoding: string, callback: Function) => void
        })
      )
        .end('asd')
        .on(
          'finish',
          mustCall(() => {
            expect(res).toBe('ASD')
            resolve()
          }) as (...args: unknown[]) => void
        )
    }))

  it('compose transform, async generator, and async function', () =>
    new Promise<void>(resolve => {
      let res = ''
      compose(
        new Transform({
          transform: mustCall((chunk: Buffer, _encoding: string, callback: Function) => {
            callback(null, chunk.toString().toUpperCase())
          }) as (chunk: Buffer, encoding: string, callback: Function) => void
        }),
        async function* (source: AsyncIterable<string>) {
          for await (const chunk of source) {
            yield chunk
          }
        },
        async function (source: AsyncIterable<string>) {
          for await (const chunk of source) {
            res += chunk
          }
        }
      )
        .end('asd')
        .on(
          'finish',
          mustCall(() => {
            expect(res).toBe('ASD')
            resolve()
          }) as (...args: unknown[]) => void
        )
    }))

  it('compose objectMode transforms with async generator', () =>
    new Promise<void>(resolve => {
      let res: any
      compose(
        new Transform({
          objectMode: true,
          transform: mustCall((chunk: any, _encoding: string, callback: Function) => {
            callback(null, { chunk })
          }) as (chunk: any, encoding: string, callback: Function) => void
        }),
        async function* (source: AsyncIterable<any>) {
          for await (const chunk of source) {
            yield chunk
          }
        },
        new Transform({
          objectMode: true,
          transform: mustCall((chunk: any, _encoding: string, callback: Function) => {
            callback(null, { chunk })
          }) as (chunk: any, encoding: string, callback: Function) => void
        })
      )
        .end(true)
        .on(
          'data',
          mustCall((buf: any) => {
            res = buf
          }) as (...args: unknown[]) => void
        )
        .on(
          'end',
          mustCall(() => {
            expect(res.chunk.chunk).toBe(true)
            resolve()
          }) as (...args: unknown[]) => void
        )
    }))

  it('compose error in first transform propagates', () =>
    new Promise<void>(resolve => {
      const _err = new Error('asd')
      compose(
        new Transform({
          objectMode: true,
          transform: mustCall((_chunk: any, _encoding: string, callback: Function) => {
            callback(_err)
          }) as (chunk: any, encoding: string, callback: Function) => void
        }),
        async function* (source: AsyncIterable<any>) {
          for await (const chunk of source) {
            yield chunk
          }
        },
        new Transform({
          objectMode: true,
          transform: mustNotCall() as (chunk: any, encoding: string, callback: Function) => void
        })
      )
        .end(true)
        .on('data', mustNotCall() as (...args: unknown[]) => void)
        .on('end', mustNotCall() as (...args: unknown[]) => void)
        .on('error', (err: Error) => {
          expect(err).toBe(_err)
          resolve()
        })
    }))

  it('compose error in async generator propagates', () =>
    new Promise<void>(resolve => {
      const _err = new Error('asd')
      compose(
        new Transform({
          objectMode: true,
          transform: mustCall((chunk: any, _encoding: string, callback: Function) => {
            callback(null, chunk)
          }) as (chunk: any, encoding: string, callback: Function) => void
        }),
        async function* (source: AsyncIterable<any>) {
          let tmp = ''
          for await (const chunk of source) {
            tmp += chunk
            throw _err
          }
          return tmp
        },
        new Transform({
          objectMode: true,
          transform: mustNotCall() as (chunk: any, encoding: string, callback: Function) => void
        })
      )
        .end(true)
        .on('data', mustNotCall() as (...args: unknown[]) => void)
        .on('end', mustNotCall() as (...args: unknown[]) => void)
        .on('error', (err: Error) => {
          expect(err).toBe(_err)
          resolve()
        })
    }))

  it('compose readable duplex from async iterator, generator, and function', () =>
    new Promise<void>(resolve => {
      let buf = ''
      const s1 = compose(
        (async function* () {
          yield 'Hello'
          yield 'World'
        })(),
        async function* (source: AsyncIterable<string>) {
          for await (const chunk of source) {
            yield String(chunk).toUpperCase()
          }
        },
        async function (source: AsyncIterable<string>) {
          for await (const chunk of source) {
            buf += chunk
          }
        }
      )
      expect(s1.writable).toBe(false)
      expect(s1.readable).toBe(false)
      finished(
        s1.resume(),
        mustCall((err: Error | null) => {
          expect(!err).toBeTruthy()
          expect(buf).toBe('HELLOWORLD')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('compose transform duplex from async generator', () =>
    new Promise<void>(resolve => {
      let buf = ''
      const s2 = compose(async function* (source: AsyncIterable<string>) {
        for await (const chunk of source) {
          yield String(chunk).toUpperCase()
        }
      })
      s2.end('helloworld')
      s2.resume()
      s2.on('data', (chunk: Buffer) => {
        buf += chunk
      })
      finished(
        s2.resume(),
        mustCall((err: Error | null) => {
          expect(!err).toBeTruthy()
          expect(buf).toBe('HELLOWORLD')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('compose from separate composed streams', () =>
    new Promise<void>(resolve => {
      let buf = ''
      const s1 = compose(
        (async function* () {
          yield 'Hello'
          yield 'World'
        })()
      )
      const s2 = compose(async function* (source: AsyncIterable<string>) {
        for await (const chunk of source) {
          yield String(chunk).toUpperCase()
        }
      })
      const s3 = compose(async function (source: AsyncIterable<string>) {
        for await (const chunk of source) {
          buf += chunk
        }
      })
      const s4 = compose(s1, s2, s3)
      finished(
        s4,
        mustCall((err: Error | null) => {
          expect(!err).toBeTruthy()
          expect(buf).toBe('HELLOWORLD')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('compose full pipeline async iterator to function', () =>
    new Promise<void>(resolve => {
      let buf = ''
      const s1 = compose(
        (async function* () {
          yield 'Hello'
          yield 'World'
        })(),
        async function* (source: AsyncIterable<string>) {
          for await (const chunk of source) {
            yield String(chunk).toUpperCase()
          }
        },
        async function (source: AsyncIterable<string>) {
          for await (const chunk of source) {
            buf += chunk
          }
        }
      )
      finished(
        s1,
        mustCall((err: Error | null) => {
          expect(!err).toBeTruthy()
          expect(buf).toBe('HELLOWORLD')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('compose throws on no args', () => {
    assertThrowsCode(() => (compose as Function)(), 'ERR_MISSING_ARGS')
  })

  it('compose throws on Writable then PassThrough', () => {
    assertThrowsCode(() => compose(new Writable(), new PassThrough()), 'ERR_INVALID_ARG_VALUE')
  })

  it('compose throws on PassThrough then Readable then PassThrough', () => {
    assertThrowsCode(
      () =>
        compose(
          new PassThrough(),
          new Readable({
            read() {}
          }),
          new PassThrough()
        ),
      'ERR_INVALID_ARG_VALUE'
    )
  })

  it('compose with return value from async function causes ERR_INVALID_RETURN_VALUE', () =>
    new Promise<void>(resolve => {
      let buf = ''
      const s1 = compose(
        (async function* () {
          yield 'Hello'
          yield 'World'
        })(),
        async function* (source: AsyncIterable<string>) {
          for await (const chunk of source) {
            yield String(chunk).toUpperCase()
          }
        },
        async function (source: AsyncIterable<string>) {
          for await (const chunk of source) {
            buf += chunk
          }
          return buf
        }
      )
      finished(
        s1,
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_INVALID_RETURN_VALUE')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('compose with string as first source', () =>
    new Promise<void>(resolve => {
      let buf = ''
      const s1 = compose(
        'HelloWorld',
        async function* (source: AsyncIterable<string>) {
          for await (const chunk of source) {
            yield String(chunk).toUpperCase()
          }
        },
        async function (source: AsyncIterable<string>) {
          for await (const chunk of source) {
            buf += chunk
          }
        }
      )
      finished(
        s1,
        mustCall((err: Error | null) => {
          expect(!err).toBeTruthy()
          expect(buf).toBe('HELLOWORLD')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('compose preserves writableObjectMode and readableObjectMode (#46829)', async () => {
    const newStream = compose(
      new PassThrough({
        readableObjectMode: false,
        writableObjectMode: false
      }),
      new Transform({
        readableObjectMode: true,
        writableObjectMode: false,
        transform: (chunk: Buffer, _encoding: string, callback: Function) => {
          callback(null, {
            value: chunk.toString()
          })
        }
      })
    )
    expect(newStream.writableObjectMode).toBe(false)
    expect(newStream.readableObjectMode).toBe(true)
    newStream.write('Steve Rogers')
    newStream.write('On your left')
    newStream.end()
    expect(await newStream.toArray()).toEqual([
      { value: 'Steve Rogers' },
      { value: 'On your left' }
    ])
  })

  it('compose preserves writableObjectMode true and readableObjectMode false (#46829)', async () => {
    const newStream = compose(
      new PassThrough({
        readableObjectMode: true,
        writableObjectMode: true
      }),
      new Transform({
        readableObjectMode: false,
        writableObjectMode: true,
        transform: (chunk: any, _encoding: string, callback: Function) => {
          callback(null, chunk.value)
        }
      })
    )
    expect(newStream.writableObjectMode).toBe(true)
    expect(newStream.readableObjectMode).toBe(false)
    newStream.write({ value: 'Steve Rogers' })
    newStream.write({ value: 'On your left' })
    newStream.end()
    expect(await newStream.toArray()).toEqual([Buffer.from('Steve RogersOn your left')])
  })
})
