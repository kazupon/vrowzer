import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-dispose', () => {
  it('should dispose readable stream with AbortError', () =>
    new Promise<void>(resolve => {
      const read = new Readable({
        read() {}
      })
      read.resume()
      read.on('end', mustNotCall('no end event') as (...args: unknown[]) => void)
      read.on('close', mustCall() as (...args: unknown[]) => void)
      read.on(
        'error',
        mustCall((err: Error) => {
          expect(err.name).toBe('AbortError')
        }) as (...args: unknown[]) => void
      )
      ;(read as any)[Symbol.asyncDispose]().then(
        mustCall(() => {
          expect(read.errored!.name).toBe('AbortError')
          expect(read.destroyed).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
