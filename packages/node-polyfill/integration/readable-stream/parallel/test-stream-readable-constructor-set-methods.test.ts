import { Readable } from 'readable-stream'
import { describe, it } from 'vitest'
import { mustCall } from '../common/index.ts'

describe('test-stream-readable-constructor-set-methods', () => {
  it('should support read method via constructor options', () =>
    new Promise<void>(resolve => {
      const _read = mustCall(function _read(this: Readable, _n: number) {
        this.push(null)
      }) as (...args: unknown[]) => void
      const r = new Readable({
        read: _read as unknown as (size: number) => void
      })
      r.on('end', () => resolve())
      r.resume()
    }))
})
