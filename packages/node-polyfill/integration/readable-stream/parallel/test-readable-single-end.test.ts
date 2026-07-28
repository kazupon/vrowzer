import { describe, it } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-readable-single-end', () => {
  it('no additional empty readable event when stream has ended', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read: () => {}
      })
      r.push(null)
      r.on('readable', mustCall() as (...args: unknown[]) => void)
      r.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
