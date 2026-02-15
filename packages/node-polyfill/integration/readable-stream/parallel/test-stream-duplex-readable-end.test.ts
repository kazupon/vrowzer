import { Readable, Transform } from 'readable-stream'
import { describe, expect, it } from 'vitest'
import { mustCall } from '../common/index.ts'

describe('test-stream-duplex-readable-end', () => {
  it('should stop reading from source when transform pushes null', () =>
    new Promise<void>(resolve => {
      let loops = 5
      const src = new Readable({
        read() {
          if (loops--) this.push(Buffer.alloc(20000))
        }
      })
      const dst = new Transform({
        transform(_chunk, _output, fn) {
          this.push(null)
          fn()
        }
      })
      src.pipe(dst)
      dst.on('data', () => {})
      dst.on(
        'end',
        mustCall(() => {
          expect(loops).toBe(3)
          expect(src.isPaused()).toBeTruthy()
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
