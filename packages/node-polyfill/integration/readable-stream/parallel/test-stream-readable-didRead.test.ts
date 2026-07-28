import { describe, it, expect } from 'vite-plus/test'
import { mustCall, mustCallAtLeast, mustNotCall } from '../common/index.ts'
// @ts-ignore - isDisturbed, isErrored exist at runtime but not in types
import { isDisturbed, isErrored, Readable } from 'readable-stream'

describe('test-stream-readable-didRead', () => {
  function noop() {}

  function check(readable: Readable, data: number, fn: () => void): Promise<void> {
    return new Promise<void>(resolve => {
      expect(readable.readableDidRead).toBe(false)
      expect(isDisturbed(readable)).toBe(false)
      expect(isErrored(readable)).toBe(false)
      if (data === -1) {
        readable.on(
          'error',
          mustCall(() => {
            expect(isErrored(readable)).toBe(true)
          }) as (...args: unknown[]) => void
        )
        readable.on('data', mustNotCall() as (...args: unknown[]) => void)
        readable.on('end', mustNotCall() as (...args: unknown[]) => void)
      } else {
        readable.on('error', mustNotCall() as (...args: unknown[]) => void)
        if (data === -2) {
          readable.on('end', mustNotCall() as (...args: unknown[]) => void)
        } else {
          readable.on('end', mustCall() as (...args: unknown[]) => void)
        }
        if (data > 0) {
          readable.on('data', mustCallAtLeast(data) as (...args: unknown[]) => void)
        } else {
          readable.on('data', mustNotCall() as (...args: unknown[]) => void)
        }
      }
      readable.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      fn()
      setImmediate(() => {
        expect(readable.readableDidRead).toBe(data > 0)
        if (data > 0) {
          expect(isDisturbed(readable)).toBe(true)
        }
      })
    })
  }

  it('readableDidRead with read() and push(null)', () => {
    const readable = new Readable({
      read() {
        this.push(null)
      }
    })
    return check(readable, 0, () => {
      readable.read()
    })
  })

  it('readableDidRead with resume() and push(null)', () => {
    const readable = new Readable({
      read() {
        this.push(null)
      }
    })
    return check(readable, 0, () => {
      readable.resume()
    })
  })

  it('readableDidRead with destroy()', () => {
    const readable = new Readable({
      read() {
        this.push(null)
      }
    })
    return check(readable, -2, () => {
      readable.destroy()
    })
  })

  it('readableDidRead with destroy(error)', () => {
    const readable = new Readable({
      read() {
        this.push(null)
      }
    })
    return check(readable, -1, () => {
      readable.destroy(new Error())
    })
  })

  it('readableDidRead with data listener', () => {
    const readable = new Readable({
      read() {
        this.push('data')
        this.push(null)
      }
    })
    return check(readable, 1, () => {
      readable.on('data', noop)
    })
  })

  it('readableDidRead with data listener added then removed', () => {
    const readable = new Readable({
      read() {
        this.push('data')
        this.push(null)
      }
    })
    return check(readable, 1, () => {
      readable.on('data', noop)
      readable.off('data', noop)
    })
  })
})
