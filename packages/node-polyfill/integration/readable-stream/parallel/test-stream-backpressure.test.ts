import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-backpressure', () => {
  it('should handle backpressure correctly', () =>
    new Promise<void>(resolve => {
      let pushes = 0
      const total = 65500 + 40 * 1024
      const rs = new Readable({
        read: mustCall(function (this: Readable) {
          if (pushes++ === 10) {
            this.push(null)
            return
          }
          const length = (this as any)._readableState.length

          // We are at most doing two full runs of _reads
          // before stopping, because Readable is greedy
          // to keep its buffer full
          expect(length <= total).toBeTruthy()
          this.push(Buffer.alloc(65500))
          for (let i = 0; i < 40; i++) {
            this.push(Buffer.alloc(1024))
          }
        }, 11) as () => void
      })
      const ws = new Writable({
        write: mustCall(function (_data: unknown, _enc: string, cb: () => void) {
          setImmediate(cb)
        }, 41 * 10) as (chunk: unknown, encoding: string, cb: () => void) => void
      })
      rs.pipe(ws)
      ws.on('close', () => {
        resolve()
      })
    }))
})
