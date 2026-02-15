import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Writable } from 'readable-stream'

describe('test-stream-writableState-uncorked-bufferedRequestCount', () => {
  it('cork/uncork and bufferedRequestCount behave correctly', () =>
    new Promise<void>(resolve => {
      const writable = new Writable()
      writable._writev = mustCall((chunks: Array<{ chunk: unknown }>, cb: () => void) => {
        expect(chunks.length).toBe(2)
        cb()
      }, 1) as (chunks: Array<{ chunk: unknown }>, cb: () => void) => void
      writable._write = mustCall((_chunk: unknown, _encoding: string, cb: () => void) => {
        cb()
      }, 1) as (chunk: unknown, encoding: string, cb: () => void) => void

      // first cork
      writable.cork()
      expect((writable as any)._writableState.corked).toBe(1)
      expect((writable as any)._writableState.bufferedRequestCount).toBe(0)

      // cork again
      writable.cork()
      expect((writable as any)._writableState.corked).toBe(2)

      // The first chunk is buffered
      writable.write('first chunk')
      expect((writable as any)._writableState.bufferedRequestCount).toBe(1)

      // First uncork does nothing
      writable.uncork()
      expect((writable as any)._writableState.corked).toBe(1)
      expect((writable as any)._writableState.bufferedRequestCount).toBe(1)

      process.nextTick(() => {
        // Second uncork flushes the buffer
        writable.uncork()
        expect((writable as any)._writableState.corked).toBe(0)
        expect((writable as any)._writableState.bufferedRequestCount).toBe(0)

        // Verify that end() uncorks correctly
        writable.cork()
        writable.write('third chunk')
        writable.end()

        // End causes an uncork() as well
        expect((writable as any)._writableState.corked).toBe(0)
        expect((writable as any)._writableState.bufferedRequestCount).toBe(0)
        resolve()
      })

      // The second chunk is buffered, because we uncork at the end of tick
      writable.write('second chunk')
      expect((writable as any)._writableState.corked).toBe(1)
      expect((writable as any)._writableState.bufferedRequestCount).toBe(2)
    }))
})
