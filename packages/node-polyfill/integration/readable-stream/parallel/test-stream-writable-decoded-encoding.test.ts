import { describe, it, expect } from 'vitest'
import { Writable } from 'readable-stream'

class MyWritable extends Writable {
  fn: (isBuffer: boolean, type: string, enc: string) => void
  constructor(
    fn: (isBuffer: boolean, type: string, enc: string) => void,
    options?: Record<string, unknown>
  ) {
    super(options)
    this.fn = fn
  }
  _write(chunk: unknown, encoding: string, callback: () => void) {
    this.fn(Buffer.isBuffer(chunk), typeof chunk, encoding)
    callback()
  }
}

describe('test-stream-writable-decoded-encoding', () => {
  it('decodeStrings true converts to buffer', () => {
    const m = new MyWritable(
      function (isBuffer, type, enc) {
        expect(isBuffer).toBe(true)
        expect(type).toBe('object')
        expect(enc).toBe('buffer')
      },
      {
        decodeStrings: true
      }
    )
    m.write('some-text', 'utf8')
    m.end()
  })

  it('decodeStrings false keeps string', () => {
    const m = new MyWritable(
      function (isBuffer, type, enc) {
        expect(isBuffer).toBe(false)
        expect(type).toBe('string')
        expect(enc).toBe('utf8')
      },
      {
        decodeStrings: false
      }
    )
    m.write('some-text', 'utf8')
    m.end()
  })
})
