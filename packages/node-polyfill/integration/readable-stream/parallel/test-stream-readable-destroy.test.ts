import { describe, it, expect } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
// @ts-ignore - addAbortSignal exists at runtime but not in types
import { Readable, addAbortSignal } from 'readable-stream'

describe('test-stream-readable-destroy', () => {
  it('destroy without error', () =>
    new Promise<void>(resolve => {
      const read = new Readable({
        read() {}
      })
      read.resume()
      read.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      read.destroy()
      expect(read.errored).toBe(null)
      expect(read.destroyed).toBe(true)
    }))

  it('destroy with error', () =>
    new Promise<void>(resolve => {
      const read = new Readable({
        read() {}
      })
      read.resume()
      const expected = new Error('kaboom')
      read.on('end', mustNotCall('no end event') as (...args: unknown[]) => void)
      read.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      read.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(expected)
        }) as (...args: unknown[]) => void
      )
      read.destroy(expected)
      expect(read.errored).toBe(expected)
      expect(read.destroyed).toBe(true)
    }))

  it('custom _destroy with error', () =>
    new Promise<void>(resolve => {
      const read = new Readable({
        read() {}
      })
      const expected = new Error('kaboom')
      read._destroy = mustCall(function (
        this: Readable,
        err: Error | null,
        cb: (err: Error | null) => void
      ) {
        expect(err).toBe(expected)
        cb(err)
      }) as (err: Error | null, cb: (err: Error | null) => void) => void
      read.on('end', mustNotCall('no end event') as (...args: unknown[]) => void)
      read.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      read.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(expected)
        }) as (...args: unknown[]) => void
      )
      read.destroy(expected)
      expect(read.destroyed).toBe(true)
    }))

  it('custom destroy option swallows error', () =>
    new Promise<void>(resolve => {
      const expected = new Error('kaboom')
      const read = new Readable({
        read() {},
        // @ts-ignore - destroy callback signature mismatch
        destroy: mustCall(function (
          this: Readable,
          err: Error | null,
          cb: (err?: Error | null) => void
        ) {
          expect(err).toBe(expected)
          cb()
        }) as any
      })
      read.on('end', mustNotCall('no end event') as (...args: unknown[]) => void)
      read.on('error', mustNotCall('no error event') as (...args: unknown[]) => void)
      read.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      read.destroy(expected)
      expect(read.destroyed).toBe(true)
    }))

  it('custom _destroy with null error', () => {
    const read = new Readable({
      read() {}
    })
    read._destroy = mustCall(function (this: Readable, err: Error | null, cb: () => void) {
      expect(err).toBe(null)
      cb()
    }) as (err: Error | null, cb: () => void) => void
    read.destroy()
    expect(read.destroyed).toBe(true)
  })

  it('custom _destroy pushing null after destroy', () =>
    new Promise<void>(resolve => {
      const read = new Readable({
        read() {}
      })
      read.resume()
      read._destroy = mustCall(function (this: Readable, err: Error | null, cb: () => void) {
        expect(err).toBe(null)
        process.nextTick(() => {
          this.push(null)
          cb()
        })
      }) as (err: Error | null, cb: () => void) => void
      const fail = mustNotCall('no end event') as (...args: unknown[]) => void
      read.on('end', fail)
      read.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      read.destroy()
      read.removeListener('end', fail)
      read.on('end', mustNotCall() as (...args: unknown[]) => void)
      expect(read.destroyed).toBe(true)
    }))

  it('custom _destroy returning error from null', () =>
    new Promise<void>(resolve => {
      const read = new Readable({
        read() {}
      })
      const expected = new Error('kaboom')
      read._destroy = mustCall(function (
        this: Readable,
        err: Error | null,
        cb: (err: Error) => void
      ) {
        expect(err).toBe(null)
        cb(expected)
      }) as (err: Error | null, cb: (err: Error) => void) => void
      let ticked = false
      read.on('end', mustNotCall('no end event') as (...args: unknown[]) => void)
      read.on(
        'error',
        mustCall((err: Error) => {
          expect(ticked).toBe(true)
          expect((read as any)._readableState.errorEmitted).toBe(true)
          expect((read as any)._readableState.errored).toBe(expected)
          expect(err).toBe(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
      read.destroy()
      expect((read as any)._readableState.errorEmitted).toBe(false)
      expect((read as any)._readableState.errored).toBe(expected)
      expect(read.destroyed).toBe(true)
      ticked = true
    }))

  it('setting destroyed to true prevents internal destroy', () => {
    const read = new Readable({
      read() {}
    })
    read.resume()
    read.destroyed = true
    expect(read.destroyed).toBe(true)
    read.on('end', mustNotCall() as (...args: unknown[]) => void)
    read.destroy()
  })

  it('MyReadable constructor sets destroyed to false', () => {
    function MyReadable(this: any) {
      expect(this.destroyed).toBe(false)
      this.destroyed = false
      Readable.call(this)
    }
    Object.setPrototypeOf(MyReadable.prototype, Readable.prototype)
    Object.setPrototypeOf(MyReadable, Readable)
    new (MyReadable as any)()
  })

  it('destroy and destroy callback', () =>
    new Promise<void>(resolve => {
      const read = new Readable({
        read() {}
      })
      read.resume()
      const expected = new Error('kaboom')
      let ticked = false
      read.on(
        'close',
        mustCall(() => {
          expect((read as any)._readableState.errorEmitted).toBe(true)
          expect(ticked).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      read.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(expected)
        }) as (...args: unknown[]) => void
      )
      expect((read as any)._readableState.errored).toBe(null)
      expect((read as any)._readableState.errorEmitted).toBe(false)
      ;(read as any).destroy(
        expected,
        mustCall(function (err: Error) {
          expect((read as any)._readableState.errored).toBe(expected)
          expect(err).toBe(expected)
        })
      )
      expect((read as any)._readableState.errorEmitted).toBe(false)
      expect((read as any)._readableState.errored).toBe(expected)
      ticked = true
    }))

  it('destroy callback with error from custom _destroy', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        destroy: mustCall(function (this: Readable, _err: Error | null, cb: (err: Error) => void) {
          process.nextTick(cb, new Error('kaboom 1'))
        }) as (err: Error | null, cb: (err: Error) => void) => void,
        read() {}
      })
      let ticked = false
      readable.on(
        'close',
        mustCall(() => {
          expect(ticked).toBe(true)
          expect((readable as any)._readableState.errorEmitted).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      readable.on(
        'error',
        mustCall((err: Error) => {
          expect(ticked).toBe(true)
          expect(err.message).toBe('kaboom 1')
          expect((readable as any)._readableState.errorEmitted).toBe(true)
        }) as (...args: unknown[]) => void
      )
      readable.destroy()
      expect(readable.destroyed).toBe(true)
      expect((readable as any)._readableState.errored).toBe(null)
      expect((readable as any)._readableState.errorEmitted).toBe(false)
      readable.destroy(new Error('kaboom 2'))
      expect((readable as any)._readableState.errorEmitted).toBe(false)
      expect((readable as any)._readableState.errored).toBe(null)
      ticked = true
    }))

  it('push after destroy is ignored for data', () => {
    const read = new Readable({
      read() {}
    })
    read.destroy()
    read.push('hi')
    read.on('data', mustNotCall() as (...args: unknown[]) => void)
  })

  it('read after destroy returns null', () => {
    const read = new Readable({
      read: mustNotCall() as () => void
    })
    read.destroy()
    expect(read.destroyed).toBe(true)
    read.read()
  })

  it('push after null emits error', () =>
    new Promise<void>(resolve => {
      const read = new Readable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: false,
        read() {
          this.push(null)
          this.push('asd')
        }
      })
      read.on(
        'error',
        mustCall(() => {
          expect((read as any)._readableState.errored).toBeTruthy()
          resolve()
        }) as (...args: unknown[]) => void
      )
      read.resume()
    }))

  it('addAbortSignal aborts readable', () =>
    new Promise<void>(resolve => {
      const controller = new AbortController()
      const read = addAbortSignal(
        controller.signal,
        new Readable({
          read() {
            this.push('asd')
          }
        })
      )
      read.on(
        'error',
        mustCall((e: Error) => {
          expect(e.name).toBe('AbortError')
          resolve()
        }) as (...args: unknown[]) => void
      )
      controller.abort()
      read.on('data', mustNotCall() as (...args: unknown[]) => void)
    }))

  it('signal option aborts readable', () =>
    new Promise<void>(resolve => {
      const controller = new AbortController()
      const read = new Readable({
        // @ts-ignore - signal exists at runtime
        signal: controller.signal,
        read() {
          this.push('asd')
        }
      })
      read.on(
        'error',
        mustCall((e: Error) => {
          expect(e.name).toBe('AbortError')
          resolve()
        }) as (...args: unknown[]) => void
      )
      controller.abort()
      read.on('data', mustNotCall() as (...args: unknown[]) => void)
    }))

  it('addAbortSignal with objectMode and async iteration', () =>
    new Promise<void>(resolve => {
      const controller = new AbortController()
      const read = addAbortSignal(
        controller.signal,
        new Readable({
          objectMode: true,
          read() {
            return false
          }
        })
      )
      read.push('asd')
      read.on(
        'error',
        mustCall((e: Error) => {
          expect(e.name).toBe('AbortError')
          resolve()
        }) as (...args: unknown[]) => void
      )
      ;(async () => {
        // eslint-disable-next-line no-unused-vars, no-empty
        for await (const _chunk of read) {
        }
      })().catch(() => {})
      setTimeout(() => controller.abort(), 0)
    }))

  it('push and read after error and close', () =>
    new Promise<void>(resolve => {
      const read = new Readable({
        read() {}
      })
      read.on('data', mustNotCall() as (...args: unknown[]) => void)
      read.on(
        'error',
        mustCall((_e: Error) => {
          read.push('asd')
          read.read()
        }) as (...args: unknown[]) => void
      )
      read.on(
        'close',
        mustCall((_e: unknown) => {
          read.push('asd')
          read.read()
          resolve()
        }) as (...args: unknown[]) => void
      )
      read.destroy(new Error('asd'))
    }))

  it('push and read after close without error', () =>
    new Promise<void>(resolve => {
      const read = new Readable({
        read() {}
      })
      read.on('data', mustNotCall() as (...args: unknown[]) => void)
      read.on(
        'close',
        mustCall((_e: unknown) => {
          read.push('asd')
          read.read()
          resolve()
        }) as (...args: unknown[]) => void
      )
      read.destroy()
    }))

  it('push and unshift after close', () =>
    new Promise<void>(resolve => {
      const read = new Readable({
        read() {}
      })
      read.on('data', mustNotCall() as (...args: unknown[]) => void)
      read.on(
        'close',
        mustCall((_e: unknown) => {
          read.push('asd')
          read.unshift('asd')
          resolve()
        }) as (...args: unknown[]) => void
      )
      read.destroy()
    }))

  it('unshift after destroy', () => {
    const read = new Readable({
      read() {}
    })
    read.on('data', mustNotCall() as (...args: unknown[]) => void)
    read.destroy()
    read.unshift('asd')
  })

  it('push after close with resume', () =>
    new Promise<void>(resolve => {
      const read = new Readable({
        read() {}
      })
      read.resume()
      read.on('data', mustNotCall() as (...args: unknown[]) => void)
      read.on(
        'close',
        mustCall((_e: unknown) => {
          read.push('asd')
          resolve()
        }) as (...args: unknown[]) => void
      )
      read.destroy()
    }))

  it('push after destroy without close listener', () => {
    const read = new Readable({
      read() {}
    })
    read.on('data', mustNotCall() as (...args: unknown[]) => void)
    read.destroy()
    read.push('asd')
  })
})
