import { describe, it } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-readable-large-hwm', () => {
  it('readable completes even when reading larger buffer', () =>
    new Promise<void>(resolve => {
      const bufferSize = 10 * 1024 * 1024
      let n = 0
      const r = new Readable({
        read() {
          r.push(Buffer.alloc(bufferSize / 10))
          if (n++ > 10) {
            r.push(null)
          }
        }
      })
      r.on('readable', () => {
        while (true) {
          const ret = r.read(bufferSize)
          if (ret === null) {
            break
          }
        }
      })
      r.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
