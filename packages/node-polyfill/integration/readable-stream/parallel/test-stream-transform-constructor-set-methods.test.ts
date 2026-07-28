import { Transform } from 'readable-stream'
import { describe, expect, it } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'

describe('test-stream-transform-constructor-set-methods', () => {
  it('should throw ERR_METHOD_NOT_IMPLEMENTED when _transform is not set', () => {
    const t = new Transform()
    expect(() => {
      t.end(Buffer.from('blerg'))
    }).toThrow(
      expect.objectContaining({
        name: 'Error',
        code: 'ERR_METHOD_NOT_IMPLEMENTED',
        message: 'The _transform() method is not implemented'
      })
    )
  })

  it('should support transform, flush, and final methods via constructor options', () =>
    new Promise<void>(resolve => {
      const _transform = mustCall((_chunk: unknown, _: unknown, next: () => void) => {
        next()
      }) as (...args: unknown[]) => void
      const _final = mustCall((next: () => void) => {
        next()
      }) as (...args: unknown[]) => void
      const _flush = mustCall((next: () => void) => {
        next()
        resolve()
      }) as (...args: unknown[]) => void
      const t2 = new Transform({
        transform: _transform as unknown as (
          chunk: unknown,
          encoding: string,
          callback: (error?: Error | null) => void
        ) => void,
        flush: _flush as unknown as (callback: (error?: Error | null) => void) => void,
        final: _final as unknown as (callback: (error?: Error | null) => void) => void
      })
      expect(t2._transform).toBe(_transform)
      expect(t2._flush).toBe(_flush)
      expect(t2._final).toBe(_final)
      t2.end(Buffer.from('blerg'))
      t2.resume()
    }))
})
