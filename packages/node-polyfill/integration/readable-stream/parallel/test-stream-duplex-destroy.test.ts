import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Duplex } from 'readable-stream'

describe('test-stream-duplex-destroy', () => {
  it('destroy without error', () =>
    new Promise<void>(resolve => {
      const duplex = new Duplex({
        write(_chunk, _enc, cb) {
          cb()
        },
        read() {}
      })
      duplex.resume()
      duplex.on('end', mustNotCall() as (...args: unknown[]) => void)
      duplex.on('finish', mustNotCall() as (...args: unknown[]) => void)
      duplex.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      duplex.destroy()
      expect(duplex.destroyed).toBe(true)
    }))

  it('destroy with error', () =>
    new Promise<void>(resolve => {
      const duplex = new Duplex({
        write(_chunk, _enc, cb) {
          cb()
        },
        read() {}
      })
      duplex.resume()
      const expected = new Error('kaboom')
      duplex.on('end', mustNotCall() as (...args: unknown[]) => void)
      duplex.on('finish', mustNotCall() as (...args: unknown[]) => void)
      duplex.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
      duplex.destroy(expected)
      expect(duplex.destroyed).toBe(true)
    }))

  it('custom _destroy with error passthrough', () =>
    new Promise<void>(resolve => {
      const duplex = new Duplex({
        write(_chunk, _enc, cb) {
          cb()
        },
        read() {}
      })
      const expected = new Error('kaboom')
      duplex._destroy = mustCall(function (
        this: Duplex,
        err: Error | null,
        cb: (err: Error | null) => void
      ) {
        expect(err).toBe(expected)
        cb(err)
      }) as (err: Error | null, cb: (err: Error | null) => void) => void
      duplex.on('finish', mustNotCall('no finish event') as (...args: unknown[]) => void)
      duplex.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
      duplex.destroy(expected)
      expect(duplex.destroyed).toBe(true)
    }))

  it('custom destroy option swallows error', () =>
    new Promise<void>(resolve => {
      const expected = new Error('kaboom')
      const duplex = new Duplex({
        write(_chunk, _enc, cb) {
          cb()
        },
        read() {},
        destroy: mustCall(function (this: Duplex, err: Error | null, cb: () => void) {
          expect(err).toBe(expected)
          cb()
        }) as any
      })
      duplex.resume()
      duplex.on('end', mustNotCall('no end event') as (...args: unknown[]) => void)
      duplex.on('finish', mustNotCall('no finish event') as (...args: unknown[]) => void)
      duplex.on('error', mustNotCall('no error event') as (...args: unknown[]) => void)
      duplex.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      duplex.destroy(expected)
      expect(duplex.destroyed).toBe(true)
    }))

  it('custom _destroy with null error', () => {
    const duplex = new Duplex({
      write(_chunk, _enc, cb) {
        cb()
      },
      read() {}
    })
    duplex._destroy = mustCall(function (this: Duplex, err: Error | null, cb: () => void) {
      expect(err).toBe(null)
      cb()
    }) as any
    duplex.destroy()
    expect(duplex.destroyed).toBe(true)
  })

  it('custom _destroy pushing null and ending after destroy', () =>
    new Promise<void>(resolve => {
      const duplex = new Duplex({
        write(_chunk, _enc, cb) {
          cb()
        },
        read() {}
      })
      duplex.resume()
      duplex._destroy = mustCall(function (this: Duplex, err: Error | null, cb: () => void) {
        expect(err).toBe(null)
        process.nextTick(() => {
          this.push(null)
          this.end()
          cb()
        })
      }) as any
      const fail = mustNotCall('no finish or end event') as (...args: unknown[]) => void
      duplex.on('finish', fail)
      duplex.on('end', fail)
      duplex.destroy()
      duplex.removeListener('end', fail)
      duplex.removeListener('finish', fail)
      duplex.on('end', mustNotCall() as (...args: unknown[]) => void)
      duplex.on('finish', mustNotCall() as (...args: unknown[]) => void)
      expect(duplex.destroyed).toBe(true)
      resolve()
    }))

  it('custom _destroy returning error from null', () =>
    new Promise<void>(resolve => {
      const duplex = new Duplex({
        write(_chunk, _enc, cb) {
          cb()
        },
        read() {}
      })
      const expected = new Error('kaboom')
      duplex._destroy = mustCall(function (
        this: Duplex,
        err: Error | null,
        cb: (err: Error) => void
      ) {
        expect(err).toBe(null)
        cb(expected)
      }) as (err: Error | null, cb: (err: Error) => void) => void
      duplex.on('finish', mustNotCall('no finish event') as (...args: unknown[]) => void)
      duplex.on('end', mustNotCall('no end event') as (...args: unknown[]) => void)
      duplex.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
      duplex.destroy()
      expect(duplex.destroyed).toBe(true)
    }))

  it('destroy with allowHalfOpen', () => {
    const duplex = new Duplex({
      write(_chunk, _enc, cb) {
        cb()
      },
      read() {},
      allowHalfOpen: true
    })
    duplex.resume()
    duplex.on('finish', mustNotCall() as (...args: unknown[]) => void)
    duplex.on('end', mustNotCall() as (...args: unknown[]) => void)
    duplex.destroy()
    expect(duplex.destroyed).toBe(true)
  })

  it('setting destroyed prevents internal destroy', () => {
    const duplex = new Duplex({
      write(_chunk, _enc, cb) {
        cb()
      },
      read() {}
    })
    duplex.destroyed = true
    expect(duplex.destroyed).toBe(true)
    duplex.on('finish', mustNotCall() as (...args: unknown[]) => void)
    duplex.on('end', mustNotCall() as (...args: unknown[]) => void)
    duplex.destroy()
  })

  it('MyDuplex constructor sets destroyed to false', () => {
    function MyDuplex(this: any) {
      expect(this.destroyed).toBe(false)
      this.destroyed = false
      Duplex.call(this)
    }
    Object.setPrototypeOf(MyDuplex.prototype, Duplex.prototype)
    Object.setPrototypeOf(MyDuplex, Duplex)
    ;new (MyDuplex as any)()
  })

  it('autoDestroy with writable false', () =>
    new Promise<void>(resolve => {
      const duplex = new Duplex({
        writable: false,
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: true,
        write(_chunk, _enc, cb) {
          cb()
        },
        read() {}
      })
      duplex.push(null)
      duplex.resume()
      duplex.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('autoDestroy with readable false', () =>
    new Promise<void>(resolve => {
      const duplex = new Duplex({
        readable: false,
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: true,
        write(_chunk, _enc, cb) {
          cb()
        },
        read() {}
      })
      duplex.end()
      duplex.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('autoDestroy with allowHalfOpen false', () =>
    new Promise<void>(resolve => {
      const duplex = new Duplex({
        allowHalfOpen: false,
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: true,
        write(_chunk, _enc, cb) {
          cb()
        },
        read() {}
      })
      duplex.push(null)
      duplex.resume()
      const orgEnd = duplex.end
      duplex.end = mustNotCall() as typeof duplex.end
      duplex.on('end', () => {
        process.nextTick(() => {
          duplex.end = mustCall(orgEnd) as typeof duplex.end
        })
      })
      duplex.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('check abort signal', () =>
    new Promise<void>(resolve => {
      const controller = new AbortController()
      const { signal } = controller
      const duplex = new Duplex({
        write(_chunk, _enc, cb) {
          cb()
        },
        read() {},
        // @ts-ignore - signal exists at runtime
        signal
      })
      let count = 0
      duplex.on(
        'error',
        mustCall((e: Error) => {
          expect(count++).toBe(0)
          expect(e.name).toBe('AbortError')
        }) as (...args: unknown[]) => void
      )
      duplex.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      controller.abort()
    }))
})
