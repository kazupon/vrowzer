import { describe, it, expect } from 'vite-plus/test'
import { Transform } from 'readable-stream'

describe('test-stream-transform-flush-data', () => {
  it('should emit flush data via callback', () => {
    const expected = 'asdf'
    function _transform(_d: unknown, _e: string, n: (err: Error | null) => void) {
      n(null)
    }
    function _flush(n: (err: Error | null, data: string) => void) {
      n(null, expected)
    }
    const t = new Transform({
      transform: _transform,
      flush: _flush as unknown as (cb: (err: Error | null, data?: unknown) => void) => void
    })
    t.end(Buffer.from('blerg'))
    t.on('data', (data: Buffer) => {
      expect(data.toString()).toBe(expected)
    })
  })
})
