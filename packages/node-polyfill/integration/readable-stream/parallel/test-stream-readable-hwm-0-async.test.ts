import { describe, it } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-hwm-0-async', () => {
  it('should continue calling _read for async push with highWaterMark 0', () =>
    new Promise<void>(resolve => {
      let count = 5
      const r = new Readable({
        read: mustCall(() => {
          process.nextTick(
            mustCall(() => {
              if (count--) r.push('a')
              else r.push(null)
            }) as (...args: unknown[]) => void
          )
        }, 6) as () => void,
        highWaterMark: 0
      })
      r.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      r.on('data', mustCall(5) as (...args: unknown[]) => void)
    }))
})
