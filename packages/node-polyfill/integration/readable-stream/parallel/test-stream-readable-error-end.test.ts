import { describe, it } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-error-end', () => {
  it('should not emit end when destroyed with error after push(null)', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read() {}
      })
      r.on('end', mustNotCall() as (...args: unknown[]) => void)
      r.on('data', mustCall() as (...args: unknown[]) => void)
      r.on(
        'error',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      r.push('asd')
      r.push(null)
      r.destroy(new Error('kaboom'))
    }))
})
