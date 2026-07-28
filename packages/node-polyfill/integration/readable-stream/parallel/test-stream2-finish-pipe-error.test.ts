import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream2-finish-pipe-error', () => {
  it('should cause uncaught exception when writable end is called after pipe without nextTick', () =>
    new Promise<void>(resolve => {
      const r = new Readable()
      r._read = function (size) {
        r.push(Buffer.allocUnsafe(size))
      }

      const w = new Writable()
      w._write = function (_data, _encoding, cb) {
        cb(null)
      }

      r.pipe(w)

      // Catch the error that is emitted when end() is called after pipe
      w.on(
        'error',
        mustCall((err: unknown) => {
          expect(err).toBeTruthy()
          resolve()
        }) as (...args: unknown[]) => void
      )

      // end() after pipe should cause an error
      w.end()
    }))
})
