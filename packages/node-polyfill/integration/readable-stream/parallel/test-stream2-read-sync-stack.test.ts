import { describe, it } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream2-read-sync-stack', () => {
  it('should handle synchronous read callbacks without stack overflow', () =>
    new Promise<void>(resolve => {
      const r = new Readable()
      const N = 256 * 1024
      let reads = 0
      r._read = function () {
        const chunk = reads++ === N ? null : Buffer.allocUnsafe(1)
        r.push(chunk)
      }
      r.on('readable', function onReadable() {
        r.read(N * 2)
      })
      r.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      r.read(0)
    }))
})
