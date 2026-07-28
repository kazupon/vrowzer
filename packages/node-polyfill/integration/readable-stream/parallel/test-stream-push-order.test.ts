import { describe, it, expect } from 'vite-plus/test'
import { Readable } from 'readable-stream'

describe('test-stream-push-order', () => {
  it('should push data in correct order', () =>
    new Promise<void>(resolve => {
      const s = new Readable({
        highWaterMark: 20,
        encoding: 'ascii'
      })
      const list = ['1', '2', '3', '4', '5', '6']
      s._read = function (_n) {
        const one = list.shift()
        if (!one) {
          s.push(null)
        } else {
          const two = list.shift()
          s.push(one)
          s.push(two!)
        }
      }
      s.read(0)

      // The original test checks at process exit. In vitest, we need to
      // wait for the stream to settle and then check.
      process.nextTick(() => {
        expect((s as any).readableBuffer.join(',')).toBe('1,2,3,4,5,6')
        resolve()
      })
    }))
})
