import { describe, it } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Writable } from 'readable-stream'

describe('test-stream-writable-final-destroy', () => {
  it('destroy after end cancels final', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write(_chunk, _encoding, callback) {
          callback(null)
        },
        final(callback) {
          queueMicrotask(callback)
        }
      })
      w.end()
      w.destroy()
      w.on('prefinish', mustNotCall() as (...args: unknown[]) => void)
      w.on('finish', mustNotCall() as (...args: unknown[]) => void)
      w.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
