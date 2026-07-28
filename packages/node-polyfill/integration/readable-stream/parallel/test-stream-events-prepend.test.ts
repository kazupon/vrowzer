import { describe, it } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Writable, Readable } from 'readable-stream'

describe('test-stream-events-prepend', () => {
  it('pipe event fires even when prependListener is undefined', () =>
    new Promise<void>(resolve => {
      class WritableWithoutPrepend extends Writable {
        constructor() {
          super()
          ;(this as any).prependListener = undefined
        }
        _write(_chunk: unknown, _end: string, cb: () => void) {
          cb()
        }
      }

      class ReadableQuickEnd extends Readable {
        _read() {
          this.push(null)
        }
      }

      const w = new WritableWithoutPrepend()
      w.on(
        'pipe',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      const r = new ReadableQuickEnd()
      r.pipe(w)
    }))
})
