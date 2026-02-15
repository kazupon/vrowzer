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

describe('test-stream-writable-change-default-encoding', () => {
  it('default encoding is utf8', () => {
    const m = new MyWritable(
      function (_isBuffer, _type, enc) {
        expect(enc).toBe('utf8')
      },
      {
        decodeStrings: false
      }
    )
    m.write('foo')
    m.end()
  })

  it('change default encoding to ascii', () => {
    const m = new MyWritable(
      function (_isBuffer, _type, enc) {
        expect(enc).toBe('ascii')
      },
      {
        decodeStrings: false
      }
    )
    m.setDefaultEncoding('ascii')
    m.write('bar')
    m.end()
  })

  it('change default encoding to invalid value throws', () => {
    expect(() => {
      const m = new MyWritable((_isBuffer, _type, _enc) => {}, {
        decodeStrings: false
      })
      m.setDefaultEncoding({} as unknown as string)
      m.write('bar')
      m.end()
    }).toThrow(
      expect.objectContaining({
        name: 'TypeError',
        code: 'ERR_UNKNOWN_ENCODING',
        message: 'Unknown encoding: {}'
      })
    )
  })

  it('check variable case encoding', () => {
    const m = new MyWritable(
      function (_isBuffer, _type, enc) {
        expect(enc).toBe('ascii')
      },
      {
        decodeStrings: false
      }
    )
    m.setDefaultEncoding('AsCii')
    m.write('bar')
    m.end()
  })
})
