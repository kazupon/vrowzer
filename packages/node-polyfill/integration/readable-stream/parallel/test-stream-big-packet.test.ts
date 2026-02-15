import { describe, it, expect } from 'vitest'
import { Transform, PassThrough } from 'readable-stream'

describe('test-stream-big-packet', () => {
  it('should handle large buffer correctly', () =>
    new Promise<void>(resolve => {
      let passed = false
      class TestStream extends Transform {
        _transform(chunk: Buffer, _encoding: string, done: () => void) {
          if (!passed) {
            // Char 'a' only exists in the last write
            passed = chunk.toString().includes('a')
          }
          done()
        }
      }
      const s1 = new Transform({
        transform(chunk, _encoding, cb) {
          process.nextTick(cb, null, chunk)
        }
      })
      const s2 = new PassThrough()
      const s3 = new TestStream()
      s1.pipe(s3)
      // Don't let s2 auto close which may close s3
      s2.pipe(s3, { end: false })

      // We must write a buffer larger than highWaterMark
      const big = Buffer.alloc(s1.writableHighWaterMark + 1, 'x')

      // Since big is larger than highWaterMark, it will be buffered internally.
      expect(s1.write(big)).toBe(false)
      // 'tiny' is small enough to pass through internal buffer.
      expect(s2.write('tiny')).toBe(true)

      // Write some small data in next IO loop, which will never be written to s3
      // Because 'drain' event is not emitted from s1 and s1 is still paused
      setImmediate(s1.write.bind(s1), 'later')

      // Assert after operations have been done
      setTimeout(() => {
        expect(passed).toBe(true)
        resolve()
      }, 50)
    }))
})
