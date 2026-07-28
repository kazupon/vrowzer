import * as stream from 'readable-stream'
import { describe, expect, it } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'

describe('test-stream-writable-ended-state', () => {
  it('should track ended state correctly', () =>
    new Promise<void>(resolve => {
      const writable = new stream.Writable()
      writable._write = (_chunk, _encoding, cb) => {
        expect(
          (writable as unknown as { _writableState: { ended: boolean } })._writableState.ended
        ).toBe(false)
        expect(
          (writable as unknown as { _writableState: { writable: unknown } })._writableState.writable
        ).toBe(undefined)
        expect(writable.writableEnded).toBe(false)
        cb()
      }
      expect(
        (writable as unknown as { _writableState: { ended: boolean } })._writableState.ended
      ).toBe(false)
      expect(
        (writable as unknown as { _writableState: { writable: unknown } })._writableState.writable
      ).toBe(undefined)
      expect(writable.writable).toBe(true)
      expect(writable.writableEnded).toBe(false)
      writable.end(
        'testing ended state',
        mustCall(() => {
          expect(
            (writable as unknown as { _writableState: { ended: boolean } })._writableState.ended
          ).toBe(true)
          expect(
            (writable as unknown as { _writableState: { writable: unknown } })._writableState
              .writable
          ).toBe(undefined)
          expect(writable.writable).toBe(false)
          expect(writable.writableEnded).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      expect(
        (writable as unknown as { _writableState: { ended: boolean } })._writableState.ended
      ).toBe(true)
      expect(
        (writable as unknown as { _writableState: { writable: unknown } })._writableState.writable
      ).toBe(undefined)
      expect(writable.writable).toBe(false)
      expect(writable.writableEnded).toBe(true)
    }))
})
