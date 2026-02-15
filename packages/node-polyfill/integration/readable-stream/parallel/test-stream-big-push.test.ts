import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-big-push', () => {
  it('should handle big pushes correctly', () =>
    new Promise<void>(resolve => {
      const str = 'asdfasdfasdfasdfasdf'
      const r = new Readable({
        highWaterMark: 5,
        encoding: 'utf8'
      })
      let reads = 0
      function _read(this: Readable) {
        if (reads === 0) {
          setTimeout(() => {
            r.push(str)
          }, 1)
          reads++
        } else if (reads === 1) {
          const ret = r.push(str)
          expect(ret).toBe(false)
          reads++
        } else {
          r.push(null)
        }
      }
      r._read = mustCall(_read, 3) as () => void
      r.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )

      // Push some data in to start.
      // We've never gotten any read event at this point.
      const ret = r.push(str)
      // Should be false. > hwm
      expect(ret).toBeFalsy()
      let chunk: string | null = r.read() as string | null
      expect(chunk).toBe(str)
      chunk = r.read() as string | null
      expect(chunk).toBe(null)
      r.once('readable', () => {
        // This time, we'll get *all* the remaining data, because
        // it's been added synchronously, as the read WOULD take
        // us below the hwm, and so it triggered a _read() again,
        // which synchronously added more, which we then return.
        chunk = r.read() as string | null
        expect(chunk).toBe(str + str)
        chunk = r.read() as string | null
        expect(chunk).toBe(null)
      })
    }))
})
