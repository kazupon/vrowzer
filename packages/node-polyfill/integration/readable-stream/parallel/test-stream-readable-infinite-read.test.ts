import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-infinite-read', () => {
  it('should handle reading large chunks with readable event', () =>
    new Promise<void>(resolve => {
      const buf = Buffer.alloc(8192)
      const readable = new Readable({
        read: mustCall(function (this: Readable) {
          this.push(buf)
        }, 31) as () => void
      })
      let i = 0
      readable.on(
        'readable',
        mustCall(function () {
          if (i++ === 10) {
            process.removeAllListeners('readable')
            resolve()
            return
          }
          const data = readable.read() as Buffer
          if (i === 1) {
            expect(data.length).toBe(8192 * 2)
          } else {
            expect(data.length).toBe(8192 * 3)
          }
        }, 11) as (...args: unknown[]) => void
      )
    }))
})
