import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable, Stream } from 'readable-stream'

describe('test-stream2-readable-legacy-drain', () => {
  it('should respect back pressure with legacy drain', () =>
    new Promise<void>(resolve => {
      const r = new Readable()
      const N = 256
      let reads = 0
      r._read = function () {
        return r.push(++reads === N ? null : Buffer.allocUnsafe(1))
      }
      r.on('end', mustCall() as (...args: unknown[]) => void)

      const w = new Stream() as any
      w.writable = true
      let buffered = 0
      w.write = function (c: Buffer) {
        buffered += c.length
        process.nextTick(drain)
        return false
      }

      function drain() {
        expect(buffered).toBeLessThanOrEqual(3)
        buffered = 0
        w.emit('drain')
      }

      w.end = mustCall(() => {
        resolve()
      }) as (...args: unknown[]) => void
      r.pipe(w)
    }))
})
