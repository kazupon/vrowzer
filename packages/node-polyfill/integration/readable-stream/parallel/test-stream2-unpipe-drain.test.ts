import { describe, it, expect } from 'vite-plus/test'
import { Readable, Writable } from 'readable-stream'

describe('test-stream2-unpipe-drain', () => {
  it('unpipe should not stall when destination never drains', () =>
    new Promise<void>(resolve => {
      class TestWriter extends Writable {
        _write(_buffer: unknown, _encoding: string, _callback: () => void) {
          // Super slow write stream (callback never called)
        }
      }
      const dest = new TestWriter()

      class TestReader extends Readable {
        reads = 0
        _read(size: number) {
          this.reads += 1
          this.push(Buffer.alloc(size))
        }
      }

      const src1 = new TestReader()
      const src2 = new TestReader()
      src1.pipe(dest)
      src1.once('readable', () => {
        process.nextTick(() => {
          src2.pipe(dest)
          src2.once('readable', () => {
            process.nextTick(() => {
              src1.unpipe(dest)
              process.nextTick(() => {
                expect(src1.reads).toBe(2)
                expect(src2.reads).toBe(2)
                resolve()
              })
            })
          })
        })
      })
    }))
})
