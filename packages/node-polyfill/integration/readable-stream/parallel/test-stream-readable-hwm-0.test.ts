import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-hwm-0', () => {
  it('should call _read for streams with highWaterMark 0 upon read(0)', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read: mustCall() as () => void,
        highWaterMark: 0
      })
      let pushedNull = false
      r.on(
        'readable',
        mustCall(() => {
          expect(r.read()).toBe(null)
          expect(pushedNull).toBe(true)
        }) as (...args: unknown[]) => void
      )
      r.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      process.nextTick(() => {
        expect(r.read()).toBe(null)
        pushedNull = true
        r.push(null)
      })
    }))
})
