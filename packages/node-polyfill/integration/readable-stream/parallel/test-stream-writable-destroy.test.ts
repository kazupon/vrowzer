import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall, expectsError } from '../common/index.ts'
// @ts-ignore - addAbortSignal exists at runtime but not in types
import { Writable, addAbortSignal } from 'readable-stream'

describe('test-stream-writable-destroy', () => {
  it('destroy without error', () =>
    new Promise<void>(resolve => {
      const write = new Writable({
        write(_chunk, _enc, cb) {
          cb()
        }
      })
      write.on('finish', mustNotCall() as (...args: unknown[]) => void)
      write.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      write.destroy()
      expect(write.destroyed).toBe(true)
    }))

  it('destroy during write', () =>
    new Promise<void>(resolve => {
      const write = new Writable({
        write(_chunk, _enc, cb) {
          // @ts-ignore - destroy exists on Writable at runtime
          this.destroy(new Error('asd'))
          cb()
        }
      })
      write.on(
        'error',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      write.on('finish', mustNotCall() as (...args: unknown[]) => void)
      write.end('asd')
      expect(write.destroyed).toBe(true)
    }))

  it('destroy with error', () =>
    new Promise<void>(resolve => {
      const write = new Writable({
        write(_chunk, _enc, cb) {
          cb()
        }
      })
      const expected = new Error('kaboom')
      write.on('finish', mustNotCall() as (...args: unknown[]) => void)
      write.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      write.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(expected)
        }) as (...args: unknown[]) => void
      )
      write.destroy(expected)
      expect(write.destroyed).toBe(true)
    }))

  it('custom _destroy with error passthrough', () =>
    new Promise<void>(resolve => {
      const write = new Writable({
        write(_chunk, _enc, cb) {
          cb()
        }
      })
      const expected = new Error('kaboom')
      write._destroy = function (err, cb) {
        expect(err).toBe(expected)
        cb(err)
      }
      write.on('finish', mustNotCall('no finish event') as (...args: unknown[]) => void)
      write.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      write.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(expected)
        }) as (...args: unknown[]) => void
      )
      write.destroy(expected)
      expect(write.destroyed).toBe(true)
    }))

  it('custom destroy option swallows error', () =>
    new Promise<void>(resolve => {
      const expected = new Error('kaboom')
      const write = new Writable({
        write(_chunk, _enc, cb) {
          cb()
        },
        destroy: mustCall(function (this: Writable, err: Error | null, cb: () => void) {
          expect(err).toBe(expected)
          cb()
        }) as any
      })
      write.on('finish', mustNotCall('no finish event') as (...args: unknown[]) => void)
      write.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      write.on('error', mustNotCall('no error event') as (...args: unknown[]) => void)
      write.destroy(expected)
      expect(write.destroyed).toBe(true)
    }))

  it('custom _destroy with null error', () => {
    const write = new Writable({
      write(_chunk, _enc, cb) {
        cb()
      }
    })
    write._destroy = mustCall(function (this: Writable, err: Error | null, cb: () => void) {
      expect(err).toBe(null)
      cb()
    }) as any
    write.destroy()
    expect(write.destroyed).toBe(true)
  })

  it('custom _destroy calling end after destroy', () =>
    new Promise<void>(resolve => {
      const write = new Writable({
        write(_chunk, _enc, cb) {
          cb()
        }
      })
      write._destroy = mustCall(function (this: Writable, err: Error | null, cb: () => void) {
        expect(err).toBe(null)
        process.nextTick(() => {
          this.end()
          cb()
        })
      }) as any
      const fail = mustNotCall('no finish event') as (...args: unknown[]) => void
      write.on('finish', fail)
      write.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      write.destroy()
      expect(write.destroyed).toBe(true)
    }))

  it('custom _destroy returning error from null', () =>
    new Promise<void>(resolve => {
      const write = new Writable({
        write(_chunk, _enc, cb) {
          cb()
        }
      })
      const expected = new Error('kaboom')
      write._destroy = mustCall(function (
        this: Writable,
        err: Error | null,
        cb: (err: Error) => void
      ) {
        expect(err).toBe(null)
        cb(expected)
      }) as (err: Error | null, cb: (err: Error) => void) => void
      write.on('close', mustCall() as (...args: unknown[]) => void)
      write.on('finish', mustNotCall('no finish event') as (...args: unknown[]) => void)
      write.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
      write.destroy()
      expect(write.destroyed).toBe(true)
    }))

  it('double error case', () =>
    new Promise<void>(resolve => {
      const write = new Writable({
        write(_chunk, _enc, cb) {
          cb()
        }
      })
      let ticked = false
      write.on(
        'close',
        mustCall(() => {
          expect(ticked).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      write.on(
        'error',
        mustCall((err: Error) => {
          expect(ticked).toBe(true)
          expect(err.message).toBe('kaboom 1')
          expect((write as any)._writableState.errorEmitted).toBe(true)
        }) as (...args: unknown[]) => void
      )
      const expected = new Error('kaboom 1')
      write.destroy(expected)
      write.destroy(new Error('kaboom 2'))
      expect((write as any)._writableState.errored).toBe(expected)
      expect((write as any)._writableState.errorEmitted).toBe(false)
      expect(write.destroyed).toBe(true)
      ticked = true
    }))

  it('destroy callback with error from custom _destroy', () =>
    new Promise<void>(resolve => {
      const writable = new Writable({
        destroy: mustCall(function (this: Writable, _err: Error | null, cb: (err: Error) => void) {
          process.nextTick(cb, new Error('kaboom 1'))
        }) as (err: Error | null, cb: (err: Error) => void) => void,
        write(_chunk, _enc, cb) {
          cb()
        }
      })
      let ticked = false
      writable.on(
        'close',
        mustCall(() => {
          writable.on('error', mustNotCall() as (...args: unknown[]) => void)
          writable.destroy(new Error('hello'))
          expect(ticked).toBe(true)
          expect((writable as any)._writableState.errorEmitted).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      writable.on(
        'error',
        mustCall((err: Error) => {
          expect(ticked).toBe(true)
          expect(err.message).toBe('kaboom 1')
          expect((writable as any)._writableState.errorEmitted).toBe(true)
        }) as (...args: unknown[]) => void
      )
      writable.destroy()
      expect(writable.destroyed).toBe(true)
      expect((writable as any)._writableState.errored).toBe(null)
      expect((writable as any)._writableState.errorEmitted).toBe(false)
      writable.destroy(new Error('kaboom 2'))
      expect((writable as any)._writableState.errorEmitted).toBe(false)
      expect((writable as any)._writableState.errored).toBe(null)
      ticked = true
    }))

  it('setting destroyed prevents internal destroy', () => {
    const write = new Writable({
      write(_chunk, _enc, cb) {
        cb()
      }
    })
    write.destroyed = true
    expect(write.destroyed).toBe(true)
    write.on('close', mustNotCall() as (...args: unknown[]) => void)
    write.destroy()
  })

  it('MyWritable constructor sets destroyed to false', () => {
    function MyWritable(this: any) {
      expect(this.destroyed).toBe(false)
      this.destroyed = false
      Writable.call(this)
    }
    Object.setPrototypeOf(MyWritable.prototype, Writable.prototype)
    Object.setPrototypeOf(MyWritable, Writable)
    new (MyWritable as any)()
  })

  it('destroy and destroy callback after already destroyed', () => {
    const write = new Writable({
      write(_chunk, _enc, cb) {
        cb()
      }
    })
    write.destroy()
    const expected = new Error('kaboom')
    ;(write as any).destroy(
      expected,
      mustCall((err: Error | undefined) => {
        expect(err).toBe(undefined)
      })
    )
  })

  it('_undestroy restores state for final', () =>
    new Promise<void>(resolve => {
      const write = new Writable({
        write: mustNotCall() as () => void,
        final: mustCall((cb: () => void) => cb(), 2) as (cb: () => void) => void,
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: true
      })
      write.end()
      write.once(
        'close',
        mustCall(() => {
          ;(write as any)._undestroy()
          write.end()
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('write after destroy returns ERR_STREAM_DESTROYED', () =>
    new Promise<void>(resolve => {
      const write = new Writable()
      write.destroy()
      write.on('error', mustNotCall() as (...args: unknown[]) => void)
      write.write('asd', (...args: unknown[]) => {
        ;(
          expectsError({
            name: 'Error',
            code: 'ERR_STREAM_DESTROYED',
            message: 'Cannot call write after a stream was destroyed'
          }) as Function
        )(...args)
        resolve()
      })
    }))

  it('write after destroy with cork/uncork', () =>
    new Promise<void>(resolve => {
      const write = new Writable({
        write(_chunk, _enc, cb) {
          cb()
        }
      })
      write.on('error', mustNotCall() as (...args: unknown[]) => void)
      write.cork()
      write.write('asd', mustCall() as any)
      write.uncork()
      write.cork()
      write.write('asd', (...args: unknown[]) => {
        ;(
          expectsError({
            name: 'Error',
            code: 'ERR_STREAM_DESTROYED',
            message: 'Cannot call write after a stream was destroyed'
          }) as Function
        )(...args)
      })
      write.destroy()
      write.write('asd', (...args: unknown[]) => {
        ;(
          expectsError({
            name: 'Error',
            code: 'ERR_STREAM_DESTROYED',
            message: 'Cannot call write after a stream was destroyed'
          }) as Function
        )(...args)
        resolve()
      })
      write.uncork()
    }))

  it('call end(cb) after error and destroy', () =>
    new Promise<void>(resolve => {
      const write = new Writable({
        write(_chunk, _enc, cb) {
          cb(new Error('asd'))
        }
      })
      write.on(
        'error',
        mustCall(() => {
          write.destroy()
          let ticked = false
          write.end(
            mustCall((err: Error & { code?: string }) => {
              expect(ticked).toBe(true)
              expect(err.code).toBe('ERR_STREAM_DESTROYED')
              resolve()
            }) as (err: Error) => void
          )
          ticked = true
        }) as (...args: unknown[]) => void
      )
      write.write('asd')
    }))

  it('call end(cb) after finish and destroy', () =>
    new Promise<void>(resolve => {
      const write = new Writable({
        write(_chunk, _enc, cb) {
          cb()
        }
      })
      write.on(
        'finish',
        mustCall(() => {
          write.destroy()
          let ticked = false
          write.end(
            mustCall((err: Error & { code?: string }) => {
              expect(ticked).toBe(true)
              expect(err.code).toBe('ERR_STREAM_ALREADY_FINISHED')
              resolve()
            }) as (err: Error) => void
          )
          ticked = true
        }) as (...args: unknown[]) => void
      )
      write.end()
    }))

  it('call end(cb) after error and destroy without unhandled exception', () =>
    new Promise<void>(resolve => {
      const write = new Writable({
        write(_chunk, _enc, cb) {
          process.nextTick(cb)
        }
      })
      const _err = new Error('asd')
      write.once(
        'error',
        mustCall((err: Error) => {
          expect(err.message).toBe('asd')
        }) as (...args: unknown[]) => void
      )
      write.end(
        'asd',
        // @ts-ignore - end overload mismatch
        mustCall((err: Error) => {
          expect(err).toBe(_err)
          resolve()
        }) as any
      )
      write.destroy(_err)
    }))

  it('call buffered write callback with error', () =>
    new Promise<void>(resolve => {
      const _err = new Error('asd')
      const write = new Writable({
        write(_chunk, _enc, cb) {
          process.nextTick(cb, _err)
        },
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: false
      })
      write.cork()
      write.write(
        'asd',
        mustCall((err: Error) => {
          expect(err).toBe(_err)
        }) as any
      )
      write.write(
        'asd',
        mustCall((err: Error) => {
          expect(err).toBe(_err)
        }) as any
      )
      write.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(_err)
          resolve()
        }) as (...args: unknown[]) => void
      )
      write.uncork()
    }))

  it('ensure callback order', () =>
    new Promise<void>(resolve => {
      let state = 0
      const write = new Writable({
        write(_chunk, _enc, cb) {
          setImmediate(cb)
        }
      })
      write.write(
        'asd',
        mustCall(() => {
          expect(state++).toBe(0)
        }) as any
      )
      write.write(
        'asd',
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_STREAM_DESTROYED')
          expect(state++).toBe(1)
          resolve()
        }) as any
      )
      write.destroy()
    }))

  it('multiple callback in write', () =>
    new Promise<void>(resolve => {
      const write = new Writable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: false,
        write(_chunk, _enc, cb) {
          cb()
          cb()
        }
      })
      write.on(
        'error',
        mustCall(() => {
          expect((write as any)._writableState.errored).toBeTruthy()
          resolve()
        }) as (...args: unknown[]) => void
      )
      write.write('asd')
    }))

  it('addAbortSignal aborts writable', () =>
    new Promise<void>(resolve => {
      const ac = new AbortController()
      const write = addAbortSignal(
        ac.signal,
        new Writable({
          write(_chunk, _enc, cb) {
            cb()
          }
        })
      )
      write.on(
        'error',
        mustCall((e: Error) => {
          expect(e.name).toBe('AbortError')
          expect(write.destroyed).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      write.write('asd')
      ac.abort()
    }))

  it('signal option aborts writable', () =>
    new Promise<void>(resolve => {
      const ac = new AbortController()
      const write = new Writable({
        // @ts-ignore - signal exists at runtime
        signal: ac.signal,
        write(_chunk, _enc, cb) {
          cb()
        }
      })
      write.on(
        'error',
        mustCall((e: Error) => {
          expect(e.name).toBe('AbortError')
          expect(write.destroyed).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      write.write('asd')
      ac.abort()
    }))

  it('pre-aborted signal destroys writable', () =>
    new Promise<void>(resolve => {
      const signal = AbortSignal.abort()
      const write = new Writable({
        // @ts-ignore - signal exists at runtime
        signal,
        write(_chunk, _enc, cb) {
          cb()
        }
      })
      write.on(
        'error',
        mustCall((e: Error) => {
          expect(e.name).toBe('AbortError')
          expect(write.destroyed).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('destroy twice', () =>
    new Promise<void>(resolve => {
      const write = new Writable({
        write(_chunk, _enc, cb) {
          cb()
        }
      })
      write.end(
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      write.destroy()
      write.destroy()
    }))

  it('destroy with error after end with callback', () =>
    new Promise<void>(resolve => {
      const s = new Writable({
        final() {}
      })
      const _err = new Error('oh no')
      s.end(
        mustCall((err: Error) => {
          expect(err).toBe(_err)
        }) as (err: Error) => void
      )
      s.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(_err)
          resolve()
        }) as (...args: unknown[]) => void
      )
      s.destroy(_err)
    }))
})
