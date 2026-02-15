import { describe, it } from 'vitest'
import { Readable, Writable } from 'readable-stream'

describe('test-stream2-finish-pipe', () => {
  it('should handle finish when writable end is called after pipe', () =>
    new Promise<void>(resolve => {
      const r = new Readable()
      r._read = function (size) {
        r.push(Buffer.allocUnsafe(size))
      }

      const w = new Writable()
      w._write = function (_data, _encoding, cb) {
        process.nextTick(cb, null)
      }

      r.pipe(w)

      // end() must be called in nextTick or a WRITE_AFTER_END error occurs.
      process.nextTick(() => {
        w.end()
        resolve()
      })
    }))
})
