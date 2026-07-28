import { describe, it } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-pipe-cleanup-pause', () => {
  it('should handle unpipe and re-pipe with cleanup', () =>
    new Promise<void>(resolve => {
      const reader = new Readable()
      const writer1 = new Writable()
      const writer2 = new Writable()

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
        cb()
      }, 1) as (...args: unknown[]) => void

      writer1.once('chunk-received', function () {
        reader.unpipe(writer1)
        reader.pipe(writer2)
        reader.push(buffer)
        setImmediate(function () {
          reader.push(buffer)
          setImmediate(function () {
            reader.push(buffer)
            setImmediate(function () {
              reader.push(null)
            })
          })
        })
      })

      let writeCount = 0
      writer2._write = mustCall(function (_chunk: Buffer, _encoding: string, cb: () => void) {
        writeCount++
        cb()
        if (writeCount === 3) {
          resolve()
        }
      }, 3) as (...args: unknown[]) => void

      reader.pipe(writer1)
      reader.push(buffer)
    }))
})
