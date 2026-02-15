import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-readable-then-resume', () => {
  // This test verifies that a stream could be resumed after
  // removing the readable event in the same tick
  it('should resume after removing readable listener in the same tick', () =>
    new Promise<void>(resolve => {
      const s = new Readable({
        objectMode: true,
        highWaterMark: 1,
        read() {
          if (!(this as any).first) {
            this.push('hello')
            ;(this as any).first = true
            return
          }
          this.push(null)
        }
      })
      const readableListener = mustNotCall() as (...args: unknown[]) => void
      s.on('readable', readableListener)
      s.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      expect(s.removeListener).toBe(s.off)
      s.removeListener('readable', readableListener)
      s.resume()
    }))
})
