import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Transform } from 'readable-stream'

describe('test-stream-writable-needdrain-state', () => {
  it('needDrain state changes correctly', () =>
    new Promise<void>(resolve => {
      const transform = new Transform({
        transform: _transform,
        highWaterMark: 1
      })

      function _transform(_chunk: unknown, _encoding: string, cb: () => void) {
        process.nextTick(() => {
          expect((transform as any)._writableState.needDrain).toBe(true)
          cb()
        })
      }

      expect((transform as any)._writableState.needDrain).toBe(false)
      transform.write(
        'asdasd',
        mustCall(() => {
          expect((transform as any)._writableState.needDrain).toBe(false)
          resolve()
        }) as (err?: Error | null) => void
      )
      expect((transform as any)._writableState.needDrain).toBe(true)
    }))
})
