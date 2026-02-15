import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-pipe-await-drain-push-while-write', () => {
  it('should handle push during write with awaitDrain', () =>
    new Promise<void>(resolve => {
      let writeCount = 0
      const writable = new Writable({
        write: mustCall(function (chunk: Buffer, _encoding: string, cb: () => void) {
          expect((readable as any)._readableState.awaitDrainWriters).toBe(null)
          if (chunk.length === 32 * 1024) {
            // first chunk
            readable.push(Buffer.alloc(34 * 1024)) // above hwm
            // We should check if awaitDrain counter is increased in the next
            // tick, because awaitDrain is incremented after this method finished
            process.nextTick(() => {
              expect((readable as any)._readableState.awaitDrainWriters).toBe(writable)
            })
          }
          process.nextTick(cb)
          writeCount++
          if (writeCount === 3) {
            process.nextTick(() => resolve())
          }
        }, 3) as (...args: unknown[]) => void
      })

      // A readable stream which produces two buffers.
      const bufs = [Buffer.alloc(32 * 1024), Buffer.alloc(33 * 1024)] // above hwm
      const readable = new Readable({
        read: function () {
          while (bufs.length > 0) {
            this.push(bufs.shift())
          }
        }
      })

      readable.pipe(writable)
    }))
})
