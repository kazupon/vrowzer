import { Duplex } from 'readable-stream'
import { describe, expect, it } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'

describe('test-stream-duplex-end', () => {
  it('should not emit finish when allowHalfOpen is true (default)', () =>
    new Promise<void>(resolve => {
      const stream = new Duplex({
        read() {}
      })
      expect(stream.allowHalfOpen).toBe(true)
      stream.on('finish', mustNotCall() as (...args: unknown[]) => void)
      expect(stream.listenerCount('end')).toBe(0)
      stream.resume()
      stream.push(null)
      stream.on('end', () => {
        setTimeout(() => resolve(), 50)
      })
    }))

  it('should emit finish when allowHalfOpen is false', () =>
    new Promise<void>(resolve => {
      const stream = new Duplex({
        read() {},
        allowHalfOpen: false
      })
      expect(stream.allowHalfOpen).toBe(false)
      stream.on(
        'finish',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      expect(stream.listenerCount('end')).toBe(0)
      stream.resume()
      stream.push(null)
    }))

  it('should not emit finish when allowHalfOpen is false but writable already ended', () =>
    new Promise<void>(resolve => {
      const stream = new Duplex({
        read() {},
        allowHalfOpen: false
      })
      expect(stream.allowHalfOpen).toBe(false)
      ;(stream as unknown as { _writableState: { ended: boolean } })._writableState.ended = true
      stream.on('finish', mustNotCall() as (...args: unknown[]) => void)
      expect(stream.listenerCount('end')).toBe(0)
      stream.resume()
      stream.push(null)
      stream.on('end', () => {
        setTimeout(() => resolve(), 50)
      })
    }))
})
