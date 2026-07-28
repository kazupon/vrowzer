import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Writable } from 'readable-stream'

describe('test-stream-write-final', () => {
  it('should call final before finish', () =>
    new Promise<void>(resolve => {
      let shutdown = false
      const w = new Writable({
        final: mustCall(function (this: Writable, cb: () => void) {
          expect(this).toBe(w)
          setTimeout(function () {
            shutdown = true
            cb()
          }, 100)
        }) as (cb: () => void) => void,
        write: function (_chunk: unknown, _e: string, cb: () => void) {
          process.nextTick(cb)
        }
      })
      w.on(
        'finish',
        mustCall(function () {
          expect(shutdown).toBeTruthy()
          resolve()
        }) as (...args: unknown[]) => void
      )
      w.write(Buffer.allocUnsafe(1))
      w.end(Buffer.allocUnsafe(0))
    }))
})
