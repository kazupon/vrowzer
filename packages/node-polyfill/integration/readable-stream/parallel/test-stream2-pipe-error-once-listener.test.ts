import { describe, it } from 'vitest'
import { Readable, Writable } from 'readable-stream'

describe('test-stream2-pipe-error-once-listener', () => {
  it('should not throw when error is emitted in _write with a once error listener', () =>
    new Promise<void>(resolve => {
      class Read extends Readable {
        _read(_size: number) {
          this.push('x')
          this.push(null)
        }
      }

      class Write extends Writable {
        _write(_buffer: unknown, _encoding: string, _cb: () => void) {
          this.emit('error', new Error('boom'))
          this.emit('alldone')
        }
      }

      const read = new Read()
      const write = new Write()
      write.once('error', () => {})
      write.once('alldone', function () {
        resolve()
      })
      read.pipe(write)
    }))
})
