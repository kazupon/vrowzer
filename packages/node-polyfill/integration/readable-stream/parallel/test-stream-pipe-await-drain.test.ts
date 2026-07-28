import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-pipe-await-drain', () => {
  it('should handle awaitDrain with multiple piped destinations', () =>
    new Promise<void>(resolve => {
      const reader = new Readable()
      const writer1 = new Writable()
      const writer2 = new Writable()
      const writer3 = new Writable()

      // 560000 is chosen here because it is larger than the (default) highWaterMark
      // and will cause `.write()` to return false
      const buffer = Buffer.allocUnsafe(560000)

      reader._read = () => {}

      writer1._write = mustCall(function (
        this: any,
        _chunk: Buffer,
        _encoding: string,
        cb: () => void
      ) {
        this.emit('chunk-received')
        process.nextTick(cb)
      }, 1) as (...args: unknown[]) => void

      writer1.once('chunk-received', () => {
        expect((reader as any)._readableState.awaitDrainWriters.size).toBe(0)
        setImmediate(() => {
          // This one should *not* get through to writer1 because writer2 is not
          // "done" processing.
          reader.push(buffer)
        })
      })

      // A "slow" consumer:
      writer2._write = mustCall((_chunk: Buffer, _encoding: string, _cb: () => void) => {
        expect((reader as any)._readableState.awaitDrainWriters.size).toBe(1)
        // Not calling cb here to "simulate" slow stream.
        resolve()
      }, 1) as (...args: unknown[]) => void

      writer3._write = mustCall((_chunk: Buffer, _encoding: string, _cb: () => void) => {
        expect((reader as any)._readableState.awaitDrainWriters.size).toBe(2)
        // Not calling cb here to "simulate" slow stream.
      }, 1) as (...args: unknown[]) => void

      reader.pipe(writer1)
      reader.pipe(writer2)
      reader.pipe(writer3)
      reader.push(buffer)
    }))
})
