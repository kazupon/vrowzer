import { describe, it } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-resume-hwm', () => {
  // readable.resume() should not lead to a ._read() call being scheduled
  // when we exceed the high water mark already.
  it('should not call _read when buffer exceeds hwm after resume', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        read: mustNotCall() as () => void,
        highWaterMark: 100
      })

      // Fill up the internal buffer so that we definitely exceed the HWM:
      for (let i = 0; i < 10; i++) {
        readable.push('a'.repeat(200))
      }

      // Call resume, and pause after one chunk.
      // The .pause() is just so that we don't empty the buffer fully, which would
      // be a valid reason to call ._read().
      readable.resume()
      readable.once(
        'data',
        mustCall(() => {
          readable.pause()
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
