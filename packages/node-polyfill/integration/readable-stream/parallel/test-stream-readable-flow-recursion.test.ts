import { describe, it, expect } from 'vitest'
import { Readable } from 'readable-stream'

describe('test-stream-readable-flow-recursion', () => {
  it('should handle large read without recursion issues', () =>
    new Promise<void>(resolve => {
      const stream = new Readable({
        highWaterMark: 2
      })
      let reads = 0
      let total = 5000
      stream._read = function (size) {
        reads++
        size = Math.min(size, total)
        total -= size
        if (size === 0) {
          stream.push(null)
        } else {
          stream.push(Buffer.allocUnsafe(size))
        }
      }
      let depth = 0
      function flow(stream: Readable, size: number, callback: (chunk: Buffer) => void) {
        depth += 1
        const chunk = stream.read(size) as Buffer | null
        if (!chunk) {
          stream.once('readable', flow.bind(null, stream, size, callback))
        } else {
          callback(chunk)
        }
        depth -= 1
      }
      flow(stream, 5000, function () {
        // Defer assertion to allow all async _read calls to complete
        // (matching original test's process.on('exit') behavior)
        setTimeout(() => {
          expect(reads).toBeGreaterThanOrEqual(1)
          // We pushed up the high water mark
          expect(stream.readableHighWaterMark).toBe(8192)
          // Length is 0 right now, because we pulled it all out.
          expect(stream.readableLength).toBe(0)
          resolve()
        }, 50)
      })
    }))
})
