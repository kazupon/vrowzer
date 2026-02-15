import { describe, it } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-data', () => {
  it('data event fires after removing and re-adding readable listener', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        read() {}
      })
      function read() {}
      readable.setEncoding('utf8')
      readable.on('readable', read)
      readable.removeListener('readable', read)
      process.nextTick(function () {
        readable.on(
          'data',
          mustCall(() => {
            resolve()
          }) as (...args: unknown[]) => void
        )
        readable.push('hello')
      })
    }))
})
