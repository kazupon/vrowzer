import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-destroy-event-order', () => {
  it('error event should fire before close event', () =>
    new Promise<void>(resolve => {
      const rs = new Readable({
        read() {}
      })
      let closed = false
      let errored = false
      rs.on(
        'close',
        mustCall(() => {
          closed = true
          expect(errored).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      rs.on(
        'error',
        mustCall((_err: Error) => {
          errored = true
          expect(closed).toBe(false)
        }) as (...args: unknown[]) => void
      )
      rs.destroy(new Error('kaboom'))
    }))
})
