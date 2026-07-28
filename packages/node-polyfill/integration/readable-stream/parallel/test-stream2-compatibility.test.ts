import { describe, it, expect } from 'vite-plus/test'
import { Readable, Writable } from 'readable-stream'

describe('test-stream2-compatibility', () => {
  it('should emit data event on TestReader and handle TestWriter', () =>
    new Promise<void>(resolve => {
      let ondataCalled = 0

      class TestReader extends Readable {
        _buffer: Buffer
        constructor() {
          super()
          this._buffer = Buffer.alloc(100, 'x')
          this.on('data', () => {
            ondataCalled++
          })
        }
        _read(_n: number) {
          this.push(this._buffer)
          this._buffer = Buffer.alloc(0)
        }
      }

      class TestWriter extends Writable {
        constructor() {
          super()
          this.write('foo')
          this.end()
        }
        _write(_chunk: unknown, _enc: string, cb: () => void) {
          cb()
        }
      }

      const reader = new TestReader()
      const writer = new TestWriter()

      setImmediate(function () {
        expect(ondataCalled).toBe(1)
        reader.push(null)

        // Give time for streams to finish
        setTimeout(() => {
          expect(reader.readable).toBe(false)
          expect(writer.writable).toBe(false)
          resolve()
        }, 50)
      })
    }))
})
