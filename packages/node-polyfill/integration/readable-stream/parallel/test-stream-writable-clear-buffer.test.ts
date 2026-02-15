import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Writable } from 'readable-stream'

// This test ensures that the _writeableState.bufferedRequestCount and
// the actual buffered request count are the same.

describe('test-stream-writable-clear-buffer', () => {
  it('bufferedRequestCount matches getBuffer().length', () =>
    new Promise<void>(resolve => {
      class StreamWritable extends Writable {
        constructor() {
          super({
            objectMode: true
          })
        }

        // Refs: https://github.com/nodejs/node/issues/6758
        // We need a timer like on the original issue thread.
        // Otherwise the code will never reach our test case.
        _write(_chunk: unknown, _encoding: string, cb: () => void) {
          setImmediate(cb)
        }
      }

      const testStream = new StreamWritable()
      testStream.cork()
      for (let i = 1; i <= 5; i++) {
        testStream.write(
          i,
          mustCall(() => {
            expect((testStream as any)._writableState.bufferedRequestCount).toBe(
              (testStream as any)._writableState.getBuffer().length
            )
          }) as (err?: Error | null) => void
        )
      }
      testStream.end()
      testStream.on(
        'finish',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
