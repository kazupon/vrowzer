import { describe, it, expect } from 'vite-plus/test'
import { Readable, Writable } from 'readable-stream'

describe('test-stream2-unpipe-leak', () => {
  it('pipe/unpipe should not leak listeners', () => {
    const chunk = Buffer.from('hallo')

    class TestWriter extends Writable {
      _write(_buffer: unknown, _encoding: string, callback: () => void) {
        callback()
      }
    }
    const dest = new TestWriter()

    class TestReader extends Readable {
      constructor() {
        super({ highWaterMark: 0x10000 })
      }
      _read(_size: number) {
        this.push(chunk)
      }
    }
    const src = new TestReader()

    for (let i = 0; i < 10; i++) {
      src.pipe(dest)
      src.unpipe(dest)
    }

    expect(src.listeners('end').length).toBe(0)
    expect(src.listeners('readable').length).toBe(0)
    expect(dest.listeners('unpipe').length).toBe(0)
    expect(dest.listeners('drain').length).toBe(0)
    expect(dest.listeners('error').length).toBe(0)
    expect(dest.listeners('close').length).toBe(0)
    expect(dest.listeners('finish').length).toBe(0)
  })
})
