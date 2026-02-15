import { describe, it } from 'vitest'
import { mustCall, mustCallAtLeast } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-pipe-flow-after-unpipe', () => {
  // Tests that calling .unpipe() un-blocks a stream that is paused because
  // it is waiting on the writable side to finish a write().
  it('should unblock stream after unpipe', () =>
    new Promise<void>(resolve => {
      const rs = new Readable({
        highWaterMark: 1,
        // That this gets called at least 20 times is the real test here.
        read: mustCallAtLeast(() => rs.push('foo'), 20) as (...args: unknown[]) => void
      })
      const ws = new Writable({
        highWaterMark: 1,
        write: mustCall(() => {
          // Ignore the callback, this write() simply never finishes.
          setImmediate(() => rs.unpipe(ws))
        }) as (...args: unknown[]) => void
      })
      let chunks = 0
      rs.on(
        'data',
        mustCallAtLeast(() => {
          chunks++
          if (chunks >= 20) {
            rs.pause() // Finish this test.
            resolve()
          }
        }) as (...args: unknown[]) => void
      )
      rs.pipe(ws)
    }))
})
