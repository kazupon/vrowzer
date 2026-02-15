import { describe, it } from 'vitest'
import { mustNotCall, expectsError } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-next-no-null', () => {
  it('should emit ERR_STREAM_NULL_VALUES when yielding null', () =>
    new Promise<void>(resolve => {
      async function* generate() {
        yield null
      }
      const stream = Readable.from(generate())
      stream.on('error', (...args: unknown[]) => {
        ;(
          expectsError({
            code: 'ERR_STREAM_NULL_VALUES',
            name: 'TypeError',
            message: 'May not write null values to stream'
          }) as Function
        )(...args)
        resolve()
      })
      stream.on('data', mustNotCall() as (...args: unknown[]) => void)
      stream.on('end', mustNotCall() as (...args: unknown[]) => void)
    }))
})
