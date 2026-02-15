import { Transform } from 'readable-stream'
import util from 'util'
import { describe, expect, it, vi } from 'vitest'

function MyTransform(this: InstanceType<typeof Transform>) {
  Transform.call(this as any)
}
util.inherits(MyTransform, Transform)

describe('test-fake-timers', () => {
  it('should handle fake timers with nested streams', () =>
    new Promise<void>(resolve => {
      // The original test fakes both setImmediate and nextTick,
      // but vitest cannot fake nextTick in child_process pool.
      // Instead, we use real timers and verify the behavior asynchronously.
      vi.useFakeTimers({
        toFake: ['setImmediate'] as any[]
      })
      let stream2DataCalled = false
      const stream = new (MyTransform as any)()
      stream.on('data', () => {
        stream.on('end', () => {
          const stream2 = new (MyTransform as any)()
          stream2.on('data', () => {
            stream2.on('end', () => {
              stream2DataCalled = true
            })
            setImmediate(() => {
              stream2.end()
            })
          })
          stream2.emit('data')
          // Run all faked timers (setImmediate) to process stream2.end()
          vi.runAllTimers()
        })
        stream.end()
      })
      stream.emit('data')
      // The stream.end() triggers 'end' via process.nextTick (real timer).
      // Wait for the real nextTick to fire, then run faked timers.
      process.nextTick(() => {
        vi.runAllTimers()
        // Wait another tick for the nested stream's 'end' event
        process.nextTick(() => {
          vi.runAllTimers()
          vi.useRealTimers()
          expect(stream2DataCalled).toBeTruthy()
          resolve()
        })
      })
    }))
})
