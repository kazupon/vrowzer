import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream2-large-read-stall', () => {
  it('should emit end when read(n) exactly consumes the remaining buffer', () =>
    new Promise<void>(resolve => {
      const READSIZE = 100
      const PUSHSIZE = 20
      const PUSHCOUNT = 1000
      const HWM = 50

      const r = new Readable({
        highWaterMark: HWM
      })
      let pushes = 0
      function push() {
        if (pushes > PUSHCOUNT) {
          return
        }
        if (pushes++ === PUSHCOUNT) {
          return r.push(null)
        }
        if (r.push(Buffer.allocUnsafe(PUSHSIZE))) {
          setTimeout(push, 1)
        }
      }

      r._read = push

      r.on('readable', function () {
        let ret
        do {
          ret = r.read(READSIZE)
        } while (ret && ret.length === READSIZE)
      })

      r.on(
        'end',
        mustCall(function () {
          expect(pushes).toBe(PUSHCOUNT + 1)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
