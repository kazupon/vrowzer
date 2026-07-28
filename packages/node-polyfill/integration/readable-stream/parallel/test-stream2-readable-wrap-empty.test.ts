import { describe, it } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'
import EE from 'events'

describe('test-stream2-readable-wrap-empty', () => {
  it('should handle wrapping an empty old-style stream', () =>
    new Promise<void>(resolve => {
      const oldStream = new EE()
      ;(oldStream as any).pause = () => {}
      ;(oldStream as any).resume = () => {}
      const newStream = new Readable().wrap(oldStream as any)
      newStream
        .on('readable', () => {})
        .on(
          'end',
          mustCall(() => {
            resolve()
          }) as (...args: unknown[]) => void
        )
      oldStream.emit('end')
    }))
})
