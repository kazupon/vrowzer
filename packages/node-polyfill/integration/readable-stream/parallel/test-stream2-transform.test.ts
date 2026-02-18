import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { PassThrough, Transform } from 'readable-stream'

describe('test-stream2-transform', () => {
  it('should verify writable side consumption', () => {
    const tx = new Transform({
      highWaterMark: 10
    })
    let transformed = 0
    tx._transform = function (chunk: Buffer, _encoding: string, cb: () => void) {
      transformed += chunk.length
      tx.push(chunk)
      cb()
    }
    for (let i = 1; i <= 10; i++) {
      tx.write(Buffer.allocUnsafe(i))
    }
    tx.end()
    expect(tx.readableLength).toBe(10)
    expect(transformed).toBe(10)
    expect(
      (tx as unknown as { writableBuffer: { chunk: Buffer }[] }).writableBuffer.map(function (c: {
        chunk: Buffer
      }) {
        return c.chunk.length
      })
    ).toEqual([5, 6, 7, 8, 9, 10])
  })

  it('should verify passthrough behavior', () => {
    const pt = new PassThrough()
    pt.write(Buffer.from('foog'))
    pt.write(Buffer.from('bark'))
    pt.write(Buffer.from('bazy'))
    pt.write(Buffer.from('kuel'))
    pt.end()
    expect(pt.read(5)!.toString()).toBe('foogb')
    expect(pt.read(5)!.toString()).toBe('arkba')
    expect(pt.read(5)!.toString()).toBe('zykue')
    expect(pt.read(5)!.toString()).toBe('l')
  })

  it('should verify object passthrough behavior', () => {
    const pt = new PassThrough({
      objectMode: true
    })
    pt.write(1)
    pt.write(true)
    pt.write(false)
    pt.write(0)
    pt.write('foo')
    pt.write('')
    pt.write({
      a: 'b'
    })
    pt.end()
    expect(pt.read()).toBe(1)
    expect(pt.read()).toBe(true)
    expect(pt.read()).toBe(false)
    expect(pt.read()).toBe(0)
    expect(pt.read()).toBe('foo')
    expect(pt.read()).toBe('')
    expect(pt.read()).toEqual({
      a: 'b'
    })
  })

  it('should verify passthrough constructor behavior', () => {
    // @ts-expect-error testing without new
    const pt = PassThrough()
    expect(pt instanceof PassThrough).toBeTruthy()
  })

  it('should verify transform constructor behavior', () => {
    // @ts-expect-error testing without new
    const pt = Transform()
    expect(pt instanceof Transform).toBeTruthy()
  })

  it('should perform a simple transform', () => {
    const pt = new Transform()
    pt._transform = function (c: Buffer, _e: string, cb: () => void) {
      const ret = Buffer.alloc(c.length, 'x')
      pt.push(ret)
      cb()
    }
    pt.write(Buffer.from('foog'))
    pt.write(Buffer.from('bark'))
    pt.write(Buffer.from('bazy'))
    pt.write(Buffer.from('kuel'))
    pt.end()
    expect(pt.read(5)!.toString()).toBe('xxxxx')
    expect(pt.read(5)!.toString()).toBe('xxxxx')
    expect(pt.read(5)!.toString()).toBe('xxxxx')
    expect(pt.read(5)!.toString()).toBe('x')
  })

  it('should verify simple object transform', () => {
    const pt = new Transform({
      objectMode: true
    })
    pt._transform = function (c: unknown, _e: string, cb: () => void) {
      pt.push(JSON.stringify(c))
      cb()
    }
    pt.write(1)
    pt.write(true)
    pt.write(false)
    pt.write(0)
    pt.write('foo')
    pt.write('')
    pt.write({
      a: 'b'
    })
    pt.end()
    expect(pt.read()).toBe('1')
    expect(pt.read()).toBe('true')
    expect(pt.read()).toBe('false')
    expect(pt.read()).toBe('0')
    expect(pt.read()).toBe('"foo"')
    expect(pt.read()).toBe('""')
    expect(pt.read()).toBe('{"a":"b"}')
  })

  it('should verify async passthrough', () =>
    new Promise<void>(resolve => {
      const pt = new Transform()
      pt._transform = function (chunk: Buffer, _encoding: string, cb: () => void) {
        setTimeout(function () {
          pt.push(chunk)
          cb()
        }, 10)
      }
      pt.write(Buffer.from('foog'))
      pt.write(Buffer.from('bark'))
      pt.write(Buffer.from('bazy'))
      pt.write(Buffer.from('kuel'))
      pt.end()
      pt.on(
        'finish',
        mustCall(function () {
          expect(pt.read(5)!.toString()).toBe('foogb')
          expect(pt.read(5)!.toString()).toBe('arkba')
          expect(pt.read(5)!.toString()).toBe('zykue')
          expect(pt.read(5)!.toString()).toBe('l')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should verify asymmetric transform (expand)', () =>
    new Promise<void>(resolve => {
      const pt = new Transform()

      // Emit each chunk 2 times.
      pt._transform = function (chunk: Buffer, _encoding: string, cb: () => void) {
        setTimeout(function () {
          pt.push(chunk)
          setTimeout(function () {
            pt.push(chunk)
            cb()
          }, 10)
        }, 10)
      }
      pt.write(Buffer.from('foog'))
      pt.write(Buffer.from('bark'))
      pt.write(Buffer.from('bazy'))
      pt.write(Buffer.from('kuel'))
      pt.end()
      pt.on(
        'finish',
        mustCall(function () {
          expect(pt.read(5)!.toString()).toBe('foogf')
          expect(pt.read(5)!.toString()).toBe('oogba')
          expect(pt.read(5)!.toString()).toBe('rkbar')
          expect(pt.read(5)!.toString()).toBe('kbazy')
          expect(pt.read(5)!.toString()).toBe('bazyk')
          expect(pt.read(5)!.toString()).toBe('uelku')
          expect(pt.read(5)!.toString()).toBe('el')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should verify asymmetric transform (compress)', () =>
    new Promise<void>(resolve => {
      const pt = new Transform() as Transform & { state: string }

      // Each output is the first char of 3 consecutive chunks,
      // or whatever's left.
      pt.state = ''
      pt._transform = function (
        this: typeof pt,
        chunk: Buffer | string,
        _encoding: string,
        cb: () => void
      ) {
        if (!chunk) {
          chunk = ''
        }
        const s = chunk.toString()
        setTimeout(() => {
          this.state += s.charAt(0)
          if (this.state.length === 3) {
            pt.push(Buffer.from(this.state))
            this.state = ''
          }
          cb()
        }, 10)
      }
      pt._flush = function (this: typeof pt, cb: () => void) {
        // Just output whatever we have.
        pt.push(Buffer.from(this.state))
        this.state = ''
        cb()
      }
      pt.write(Buffer.from('aaaa'))
      pt.write(Buffer.from('bbbb'))
      pt.write(Buffer.from('cccc'))
      pt.write(Buffer.from('dddd'))
      pt.write(Buffer.from('eeee'))
      pt.write(Buffer.from('aaaa'))
      pt.write(Buffer.from('bbbb'))
      pt.write(Buffer.from('cccc'))
      pt.write(Buffer.from('dddd'))
      pt.write(Buffer.from('eeee'))
      pt.write(Buffer.from('aaaa'))
      pt.write(Buffer.from('bbbb'))
      pt.write(Buffer.from('cccc'))
      pt.write(Buffer.from('dddd'))
      pt.end()

      // 'abcdeabcdeabcd'
      pt.on(
        'finish',
        mustCall(function () {
          expect(pt.read(5)!.toString()).toBe('abcde')
          expect(pt.read(5)!.toString()).toBe('abcde')
          expect(pt.read(5)!.toString()).toBe('abcd')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should verify complex transform behavior', () =>
    new Promise<void>(resolve => {
      let count = 0
      let saved: Buffer | null = null
      const pt = new Transform({
        highWaterMark: 3
      })
      pt._transform = function (c: Buffer, _e: string, cb: () => void) {
        if (count++ === 1) {
          saved = c
        } else {
          if (saved) {
            pt.push(saved)
            saved = null
          }
          pt.push(c)
        }
        cb()
      }
      pt.once('readable', function () {
        process.nextTick(function () {
          pt.write(Buffer.from('d'))
          pt.write(
            Buffer.from('ef'),
            mustCall(function () {
              pt.end()
            }) as () => void
          )
          expect(pt.read()!.toString()).toBe('abcdef')
          expect(pt.read()).toBeNull()
          resolve()
        })
      })
      pt.write(Buffer.from('abc'))
    }))

  it('should verify passthrough event emission', () => {
    const pt = new PassThrough()
    let emits = 0
    pt.on('readable', function () {
      emits++
    })
    pt.write(Buffer.from('foog'))
    pt.write(Buffer.from('bark'))
    expect(emits).toBe(0)
    expect(pt.read(5)!.toString()).toBe('foogb')
    expect(String(pt.read(5))).toBe('null')
    expect(emits).toBe(0)
    pt.write(Buffer.from('bazy'))
    pt.write(Buffer.from('kuel'))
    expect(emits).toBe(0)
    expect(pt.read(5)!.toString()).toBe('arkba')
    expect(pt.read(5)!.toString()).toBe('zykue')
    expect(pt.read(5)).toBeNull()
    pt.end()
    expect(emits).toBe(1)
    expect(pt.read(5)!.toString()).toBe('l')
    expect(pt.read(5)).toBeNull()
    expect(emits).toBe(1)
  })

  it('should verify passthrough event emission reordering', () =>
    new Promise<void>(resolve => {
      const pt = new PassThrough()
      let emits = 0
      pt.on('readable', function () {
        emits++
      })
      pt.write(Buffer.from('foog'))
      pt.write(Buffer.from('bark'))
      expect(emits).toBe(0)
      expect(pt.read(5)!.toString()).toBe('foogb')
      expect(pt.read(5)).toBeNull()
      pt.once(
        'readable',
        mustCall(function () {
          expect(pt.read(5)!.toString()).toBe('arkba')
          expect(pt.read(5)).toBeNull()
          pt.once(
            'readable',
            mustCall(function () {
              expect(pt.read(5)!.toString()).toBe('zykue')
              expect(pt.read(5)).toBeNull()
              pt.once(
                'readable',
                mustCall(function () {
                  expect(pt.read(5)!.toString()).toBe('l')
                  expect(pt.read(5)).toBeNull()
                  expect(emits).toBe(3)
                  resolve()
                }) as (...args: unknown[]) => void
              )
              pt.end()
            }) as (...args: unknown[]) => void
          )
          pt.write(Buffer.from('kuel'))
        }) as (...args: unknown[]) => void
      )
      pt.write(Buffer.from('bazy'))
    }))

  it('should verify passthrough facade', () =>
    new Promise<void>(resolve => {
      const pt = new PassThrough()
      const datas: string[] = []
      pt.on('data', function (chunk: Buffer) {
        datas.push(chunk.toString())
      })
      pt.on(
        'end',
        mustCall(function () {
          expect(datas).toEqual(['foog', 'bark', 'bazy', 'kuel'])
          resolve()
        }) as (...args: unknown[]) => void
      )
      pt.write(Buffer.from('foog'))
      setTimeout(function () {
        pt.write(Buffer.from('bark'))
        setTimeout(function () {
          pt.write(Buffer.from('bazy'))
          setTimeout(function () {
            pt.write(Buffer.from('kuel'))
            setTimeout(function () {
              pt.end()
            }, 10)
          }, 10)
        }, 10)
      }, 10)
    }))

  it('should verify object transform (JSON parse)', () =>
    new Promise<void>(resolve => {
      const jp = new Transform({
        objectMode: true
      })
      jp._transform = function (data: string, _encoding: string, cb: (err?: Error) => void) {
        try {
          jp.push(JSON.parse(data))
          cb()
        } catch (er) {
          cb(er as Error)
        }
      }

      // Anything except null/undefined is fine.
      const objects = [
        { foo: 'bar' },
        100,
        'string',
        {
          nested: {
            things: [{ foo: 'bar' }, 100, 'string']
          }
        }
      ]
      let ended = false
      jp.on('end', function () {
        ended = true
      })
      objects.forEach(function (obj) {
        jp.write(JSON.stringify(obj))
        const res = jp.read()
        expect(res).toEqual(obj)
      })
      jp.end()
      // Read one more time to get the 'end' event
      jp.read()
      process.nextTick(
        mustCall(function () {
          expect(ended).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should verify object transform (JSON stringify)', () =>
    new Promise<void>(resolve => {
      const js = new Transform({
        objectMode: true
      })
      js._transform = function (data: unknown, _encoding: string, cb: (err?: Error) => void) {
        try {
          js.push(JSON.stringify(data))
          cb()
        } catch (er) {
          cb(er as Error)
        }
      }

      // Anything except null/undefined is fine.
      const objects = [
        { foo: 'bar' },
        100,
        'string',
        {
          nested: {
            things: [{ foo: 'bar' }, 100, 'string']
          }
        }
      ]
      let ended = false
      js.on('end', function () {
        ended = true
      })
      objects.forEach(function (obj) {
        js.write(obj)
        const res = js.read()
        expect(res).toBe(JSON.stringify(obj))
      })
      js.end()
      // Read one more time to get the 'end' event
      js.read()
      process.nextTick(
        mustCall(function () {
          expect(ended).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should verify transform with construct', () =>
    new Promise<void>(resolve => {
      const s = new Transform({
        objectMode: true,
        // @ts-ignore - construct exists at runtime
        construct(callback: () => void) {
          // @ts-ignore - this refers to Transform instance at runtime
          this.push('header from constructor')
          callback()
        },
        transform: (
          _row: unknown,
          _encoding: string,
          callback: (err: null, data: unknown) => void
        ) => {
          callback(null, _row)
        }
      })
      const expected = ['header from constructor', 'firstLine', 'secondLine']
      s.on(
        'data',
        mustCall((data: unknown) => {
          expect((data as { toString: () => string }).toString()).toBe(expected.shift())
          if (expected.length === 0) {
            resolve()
          }
        }, 3) as (...args: unknown[]) => void
      )
      s.write('firstLine')
      process.nextTick(() => s.write('secondLine'))
    }))
})
