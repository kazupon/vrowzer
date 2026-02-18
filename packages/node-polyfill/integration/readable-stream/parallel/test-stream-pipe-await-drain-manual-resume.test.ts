import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-pipe-await-drain-manual-resume', () => {
  it('should handle manual resume with awaitDrain', () =>
    new Promise<void>(resolve => {
      // A consumer stream with a very low highWaterMark, which starts in a state
      // where it buffers the chunk it receives rather than indicating that they
      // have been consumed.
      const writable = new Writable({
        highWaterMark: 5
      })
      let isCurrentlyBufferingWrites = true
      const queue: Array<{ chunk: Buffer; cb: () => void }> = []
      writable._write = (chunk: Buffer, _encoding: string, cb: () => void) => {
        if (isCurrentlyBufferingWrites) {
          queue.push({ chunk, cb })
        } else {
          cb()
        }
      }

      const readable = new Readable({
        read() {}
      })
      readable.pipe(writable)

      readable.once(
        'pause',
        mustCall(() => {
          expect((readable as any)._readableState.awaitDrainWriters).toBe(writable)

          // First pause, resume manually. The next write() to writable will still
          // return false, because chunks are still being buffered, so it will increase
          // the awaitDrain counter again.
          process.nextTick(
            mustCall(() => {
              readable.resume()
            }) as (...args: unknown[]) => void
          )

          readable.once(
            'pause',
            mustCall(() => {
              expect((readable as any)._readableState.awaitDrainWriters).toBe(writable)

              // Second pause, handle all chunks from now on. Once all callbacks that
              // are currently queued up are handled, the awaitDrain drain counter should
              // fall back to 0 and all chunks that are pending on the readable side
              // should be flushed.
              isCurrentlyBufferingWrites = false
              for (const queued of queue) {
                queued.cb()
              }
            }) as (...args: unknown[]) => void
          )
        }) as (...args: unknown[]) => void
      )

      readable.push(Buffer.alloc(100)) // Fill the writable HWM, first 'pause'.
      readable.push(Buffer.alloc(100)) // Second 'pause'.
      readable.push(Buffer.alloc(100)) // Should get through to the writable.
      readable.push(null)

      writable.on(
        'finish',
        mustCall(() => {
          expect((readable as any)._readableState.awaitDrainWriters).toBe(null)
          // Everything okay, all chunks were written.
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
