import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall, expectsError } from '../common/index.ts'
import { Writable, Readable, Duplex } from 'readable-stream'

describe('test-stream-construct', () => {
  it('Writable multiple callback', () =>
    new Promise<void>(resolve => {
      new Writable({
        // @ts-ignore - construct exists at runtime
        construct: mustCall((callback: (err?: Error) => void) => {
          callback()
          callback()
        }) as (callback: (err?: Error) => void) => void
      }).on('error', (...args: unknown[]) => {
        ;(expectsError({ name: 'Error', code: 'ERR_MULTIPLE_CALLBACK' }) as Function)(...args)
        resolve()
      })
    }))

  it('Readable multiple callback', () =>
    new Promise<void>(resolve => {
      new Readable({
        // @ts-ignore - construct exists at runtime
        construct: mustCall((callback: (err?: Error) => void) => {
          callback()
          callback()
        }) as (callback: (err?: Error) => void) => void
      }).on('error', (...args: unknown[]) => {
        ;(expectsError({ name: 'Error', code: 'ERR_MULTIPLE_CALLBACK' }) as Function)(...args)
        resolve()
      })
    }))

  it('Writable synchronous error', () =>
    new Promise<void>(resolve => {
      new Writable({
        // @ts-ignore - construct exists at runtime
        construct: mustCall((callback: (err?: Error) => void) => {
          callback(new Error('test'))
        }) as (callback: (err?: Error) => void) => void
      }).on('error', (...args: unknown[]) => {
        ;(expectsError({ name: 'Error', message: 'test' }) as Function)(...args)
        resolve()
      })
    }))

  it('Readable synchronous error', () =>
    new Promise<void>(resolve => {
      new Readable({
        // @ts-ignore - construct exists at runtime
        construct: mustCall((callback: (err?: Error) => void) => {
          callback(new Error('test'))
        }) as (callback: (err?: Error) => void) => void
      }).on('error', (...args: unknown[]) => {
        ;(expectsError({ name: 'Error', message: 'test' }) as Function)(...args)
        resolve()
      })
    }))

  it('Writable asynchronous error', () =>
    new Promise<void>(resolve => {
      new Writable({
        // @ts-ignore - construct exists at runtime
        construct: mustCall((callback: (err?: Error) => void) => {
          process.nextTick(callback, new Error('test'))
        }) as (callback: (err?: Error) => void) => void
      }).on('error', (...args: unknown[]) => {
        ;(expectsError({ name: 'Error', message: 'test' }) as Function)(...args)
        resolve()
      })
    }))

  it('Readable asynchronous error', () =>
    new Promise<void>(resolve => {
      new Readable({
        // @ts-ignore - construct exists at runtime
        construct: mustCall((callback: (err?: Error) => void) => {
          process.nextTick(callback, new Error('test'))
        }) as (callback: (err?: Error) => void) => void
      }).on('error', (...args: unknown[]) => {
        ;(expectsError({ name: 'Error', message: 'test' }) as Function)(...args)
        resolve()
      })
    }))

  describe('testDestroy for Readable', () => {
    const factory = (opts: Record<string, unknown>) =>
      new Readable({
        read: mustNotCall() as () => void,
        ...opts
      })

    it('destroy waits for construct', () =>
      new Promise<void>(resolve => {
        let constructed = false
        const s = factory({
          construct: mustCall((cb: () => void) => {
            constructed = true
            process.nextTick(cb)
          }) as (cb: () => void) => void
        })
        s.on(
          'close',
          mustCall(() => {
            expect(constructed).toBe(true)
            resolve()
          }) as (...args: unknown[]) => void
        )
        s.destroy()
      }))

    it('destroy with callback waits for construct', () =>
      new Promise<void>(resolve => {
        let constructed = false
        const s = factory({
          construct: mustCall((cb: () => void) => {
            constructed = true
            process.nextTick(cb)
          }) as (cb: () => void) => void
        })
        s.on(
          'close',
          mustCall(() => {
            expect(constructed).toBe(true)
            resolve()
          }) as (...args: unknown[]) => void
        )
        // @ts-ignore - destroy accepts (err, cb) at runtime
        s.destroy(null, () => {
          expect(constructed).toBe(true)
        })
      }))

    it('destroy without error waits for construct', () =>
      new Promise<void>(resolve => {
        let constructed = false
        const s = factory({
          construct: mustCall((cb: () => void) => {
            constructed = true
            process.nextTick(cb)
          }) as (cb: () => void) => void
        })
        s.on(
          'close',
          mustCall(() => {
            expect(constructed).toBe(true)
            resolve()
          }) as (...args: unknown[]) => void
        )
        s.destroy()
      }))

    it('destroy with error waits for construct', () =>
      new Promise<void>(resolve => {
        let constructed = false
        const s = factory({
          construct: mustCall((cb: () => void) => {
            constructed = true
            process.nextTick(cb)
          }) as (cb: () => void) => void
        })
        s.on(
          'close',
          mustCall(() => {
            expect(constructed).toBe(true)
            resolve()
          }) as (...args: unknown[]) => void
        )
        s.on(
          'error',
          mustCall((err: Error) => {
            expect(err.message).toBe('kaboom')
          }) as (...args: unknown[]) => void
        )
        // @ts-ignore - destroy accepts (err, cb) at runtime
        s.destroy(new Error('kaboom'), (err: Error) => {
          expect(err.message).toBe('kaboom')
          expect(constructed).toBe(true)
        })
      }))

    it('destroy with error emits error after construct', () =>
      new Promise<void>(resolve => {
        let constructed = false
        const s = factory({
          construct: mustCall((cb: () => void) => {
            constructed = true
            process.nextTick(cb)
          }) as (cb: () => void) => void
        })
        s.on(
          'error',
          mustCall(() => {
            expect(constructed).toBe(true)
          }) as (...args: unknown[]) => void
        )
        s.on(
          'close',
          mustCall(() => {
            expect(constructed).toBe(true)
            resolve()
          }) as (...args: unknown[]) => void
        )
        s.destroy(new Error())
      }))
  })

  describe('testDestroy for Writable', () => {
    const factory = (opts: Record<string, unknown>) =>
      new Writable({
        write: mustNotCall() as () => void,
        final: mustNotCall() as () => void,
        ...opts
      })

    it('destroy waits for construct', () =>
      new Promise<void>(resolve => {
        let constructed = false
        const s = factory({
          construct: mustCall((cb: () => void) => {
            constructed = true
            process.nextTick(cb)
          }) as (cb: () => void) => void
        })
        s.on(
          'close',
          mustCall(() => {
            expect(constructed).toBe(true)
            resolve()
          }) as (...args: unknown[]) => void
        )
        s.destroy()
      }))

    it('destroy with callback waits for construct', () =>
      new Promise<void>(resolve => {
        let constructed = false
        const s = factory({
          construct: mustCall((cb: () => void) => {
            constructed = true
            process.nextTick(cb)
          }) as (cb: () => void) => void
        })
        s.on(
          'close',
          mustCall(() => {
            expect(constructed).toBe(true)
            resolve()
          }) as (...args: unknown[]) => void
        )
        // @ts-ignore - destroy accepts (err, cb) at runtime
        s.destroy(null, () => {
          expect(constructed).toBe(true)
        })
      }))

    it('destroy without error waits for construct', () =>
      new Promise<void>(resolve => {
        let constructed = false
        const s = factory({
          construct: mustCall((cb: () => void) => {
            constructed = true
            process.nextTick(cb)
          }) as (cb: () => void) => void
        })
        s.on(
          'close',
          mustCall(() => {
            expect(constructed).toBe(true)
            resolve()
          }) as (...args: unknown[]) => void
        )
        s.destroy()
      }))

    it('destroy with error waits for construct', () =>
      new Promise<void>(resolve => {
        let constructed = false
        const s = factory({
          construct: mustCall((cb: () => void) => {
            constructed = true
            process.nextTick(cb)
          }) as (cb: () => void) => void
        })
        s.on(
          'close',
          mustCall(() => {
            expect(constructed).toBe(true)
            resolve()
          }) as (...args: unknown[]) => void
        )
        s.on(
          'error',
          mustCall((err: Error) => {
            expect(err.message).toBe('kaboom')
          }) as (...args: unknown[]) => void
        )
        // @ts-ignore - destroy accepts (err, cb) at runtime
        s.destroy(new Error('kaboom'), (err: Error) => {
          expect(err.message).toBe('kaboom')
          expect(constructed).toBe(true)
        })
      }))

    it('destroy with error emits error after construct', () =>
      new Promise<void>(resolve => {
        let constructed = false
        const s = factory({
          construct: mustCall((cb: () => void) => {
            constructed = true
            process.nextTick(cb)
          }) as (cb: () => void) => void
        })
        s.on(
          'error',
          mustCall(() => {
            expect(constructed).toBe(true)
          }) as (...args: unknown[]) => void
        )
        s.on(
          'close',
          mustCall(() => {
            expect(constructed).toBe(true)
            resolve()
          }) as (...args: unknown[]) => void
        )
        s.destroy(new Error())
      }))
  })

  it('Readable autoDestroy with construct', () =>
    new Promise<void>(resolve => {
      let constructed = false
      const r = new Readable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: true,
        construct: mustCall((cb: () => void) => {
          constructed = true
          process.nextTick(cb)
        }) as (cb: () => void) => void,
        read: mustCall(() => {
          expect(constructed).toBe(true)
          r.push(null)
        }) as () => void
      })
      r.on(
        'close',
        mustCall(() => {
          expect(constructed).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      r.on('data', mustNotCall() as (...args: unknown[]) => void)
    }))

  it('Writable autoDestroy with construct and write', () =>
    new Promise<void>(resolve => {
      let constructed = false
      const w = new Writable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: true,
        construct: mustCall((cb: () => void) => {
          constructed = true
          process.nextTick(cb)
        }) as (cb: () => void) => void,
        write: mustCall((_chunk: unknown, _encoding: string, cb: () => void) => {
          expect(constructed).toBe(true)
          process.nextTick(cb)
        }) as (chunk: unknown, encoding: string, cb: () => void) => void,
        final: mustCall((cb: () => void) => {
          expect(constructed).toBe(true)
          process.nextTick(cb)
        }) as (cb: () => void) => void
      })
      w.on(
        'close',
        mustCall(() => {
          expect(constructed).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      w.end('data')
    }))

  it('Writable autoDestroy with construct and empty end', () =>
    new Promise<void>(resolve => {
      let constructed = false
      const w = new Writable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: true,
        construct: mustCall((cb: () => void) => {
          constructed = true
          process.nextTick(cb)
        }) as (cb: () => void) => void,
        write: mustNotCall() as () => void,
        final: mustCall((cb: () => void) => {
          expect(constructed).toBe(true)
          process.nextTick(cb)
        }) as (cb: () => void) => void
      })
      w.on(
        'close',
        mustCall(() => {
          expect(constructed).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      w.end()
    }))

  it('Duplex construct is called', () =>
    new Promise<void>(resolve => {
      new Duplex({
        // @ts-ignore - construct exists at runtime
        construct: mustCall((_cb: () => void) => {
          resolve()
        }) as (cb: () => void) => void
      })
    }))

  it('Duplex construct with readable false', () =>
    new Promise<void>(resolve => {
      let constructed = false
      const d = new Duplex({
        readable: false,
        // @ts-ignore - construct exists at runtime
        construct: mustCall((callback: () => void) => {
          setImmediate(
            mustCall(() => {
              constructed = true
              callback()
            }) as () => void
          )
        }) as (callback: () => void) => void,
        write(_chunk: unknown, _encoding: string, callback: () => void) {
          callback()
        },
        read() {
          this.push(null)
        }
      })
      d.resume()
      d.end('foo')
      d.on(
        'close',
        mustCall(() => {
          expect(constructed).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Construct should not cause stream to read', () =>
    new Promise<void>(resolve => {
      new Readable({
        // @ts-ignore - construct exists at runtime
        construct: mustCall((callback: () => void) => {
          callback()
          // Give time for any spurious _read calls, then resolve
          setImmediate(resolve)
        }) as (callback: () => void) => void,
        read: mustNotCall() as () => void
      })
    }))
})
