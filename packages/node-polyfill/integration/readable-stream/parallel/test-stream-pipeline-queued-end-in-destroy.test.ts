import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Readable, Duplex, pipeline } from 'readable-stream'

describe('test-stream-pipeline-queued-end-in-destroy', () => {
  // Test that the callback for pipeline() is called even when the ._destroy()
  // method of the stream places an .end() request to itself that does not
  // get processed before the destruction of the stream (i.e. the 'close' event).
  // Refs: https://github.com/nodejs/node/issues/24456
  it('should call pipeline callback even when destroy queues end', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        read: mustCall() as (...args: unknown[]) => void
      })
      const duplex = new Duplex({
        write(_chunk: Buffer, _enc: string, _cb: () => void) {
          // Simulate messages queueing up.
        },
        read() {},
        destroy(err: Error | null, cb: (err: Error | null) => void) {
          // Call end() from inside the destroy() method, like HTTP/2 streams
          // do at the time of writing.
          // @ts-ignore - end exists on Duplex at runtime
          this.end()
          cb(err)
        }
      })
      duplex.on('finished', mustNotCall() as (...args: unknown[]) => void)
      pipeline(
        readable,
        duplex,
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_STREAM_PREMATURE_CLOSE')
          resolve()
        }) as (...args: unknown[]) => void
      )

      // Write one chunk of data, and destroy the stream later.
      // That should trigger the pipeline destruction.
      readable.push('foo')
      setImmediate(() => {
        readable.destroy()
      })
    }))
})
