import { describe, it } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-end-destroyed', () => {
  it('should not emit end after close when push(null) called after destroy', () =>
    new Promise<void>(resolve => {
      const r = new Readable()
      r.on('end', mustNotCall() as (...args: unknown[]) => void)
      r.resume()
      r.destroy()
      r.on(
        'close',
        mustCall(() => {
          r.push(null)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
