import * as stream from 'readable-stream'
import { describe, expect, it } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'

describe('test-stream-writable-finished-state', () => {
  it('should track finished state correctly', () =>
    new Promise<void>(resolve => {
      const writable = new stream.Writable()
      writable._write = (_chunk, _encoding, cb) => {
        expect(
          (writable as unknown as { _writableState: { finished: boolean } })._writableState.finished
        ).toBe(false)
        cb()
      }
      writable.on(
        'finish',
        mustCall(() => {
          expect(
            (writable as unknown as { _writableState: { finished: boolean } })._writableState
              .finished
          ).toBe(true)
        }) as (...args: unknown[]) => void
      )
      writable.end(
        'testing finished state',
        mustCall(() => {
          expect(
            (writable as unknown as { _writableState: { finished: boolean } })._writableState
              .finished
          ).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
