import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

class TestReadable extends Readable {
  _ended: boolean
  constructor(opt?: Record<string, unknown>) {
    super(opt)
    this._ended = false
  }
  _read() {
    if (this._ended) {
      this.emit('error', new Error('_read called twice'))
    }
    this._ended = true
    this.push(null)
  }
}

class TestWritable extends Writable {
  _written: Buffer[]
  constructor(opt?: Record<string, unknown>) {
    super(opt)
    this._written = []
  }
  _write(chunk: Buffer, _encoding: string, cb: () => void) {
    this._written.push(chunk)
    cb()
  }
}

describe('test-stream-pipe-after-end', () => {
  it('should pipe a Readable that is already ended', () =>
    new Promise<void>(resolve => {
      // This one should not emit 'end' until we read() from it later.
      const ender = new TestReadable()

      // What happens when you pipe() a Readable that's already ended?
      const piper = new TestReadable()
      // pushes EOF null, and length=0, so this will trigger 'end'
      piper.read()

      setTimeout(
        mustCall(function () {
          ender.on('end', mustCall() as (...args: unknown[]) => void)
          const c = ender.read()
          expect(c).toBe(null)
          const w = new TestWritable()
          w.on(
            'finish',
            mustCall(() => {
              resolve()
            }) as (...args: unknown[]) => void
          )
          piper.pipe(w)
        }) as (...args: unknown[]) => void,
        1
      )
    }))
})
