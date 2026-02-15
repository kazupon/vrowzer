import { describe, it } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-pipe-deadlock', () => {
  // https://github.com/nodejs/node/issues/48666
  it('should not deadlock when src is internally ended with buffered data pending', () =>
    new Promise<void>(resolve => {
      ;(async () => {
        // Prepare src that is internally ended, with buffered data pending
        const src = new Readable({
          read() {}
        })
        src.push(Buffer.alloc(100))
        src.push(null)
        src.pause()

        // Give it time to settle
        await new Promise<void>(r => setImmediate(r))
        const dst = new Writable({
          highWaterMark: 1000,
          write(_buf: Buffer, _enc: string, cb: () => void) {
            process.nextTick(cb)
          }
        })
        dst.write(Buffer.alloc(1000)) // Fill write buffer
        dst.on(
          'finish',
          mustCall(() => {
            resolve()
          }) as (...args: unknown[]) => void
        )
        src.pipe(dst)
      })().then(mustCall() as (...args: unknown[]) => void)
    }))
})
