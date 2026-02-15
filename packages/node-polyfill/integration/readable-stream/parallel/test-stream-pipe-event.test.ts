import { describe, it, expect } from 'vitest'
import { Stream } from 'readable-stream'

describe('test-stream-pipe-event', () => {
  it('should emit pipe event on destination', () => {
    function Writable(this: any) {
      this.writable = true
      Stream.call(this)
    }
    Object.setPrototypeOf(Writable.prototype, Stream.prototype)
    Object.setPrototypeOf(Writable, Stream)

    function Readable(this: any) {
      this.readable = true
      Stream.call(this)
    }
    Object.setPrototypeOf(Readable.prototype, Stream.prototype)
    Object.setPrototypeOf(Readable, Stream)

    let passed = false
    const w = new (Writable as any)()
    w.on('pipe', function (_src: any) {
      passed = true
    })
    const r = new (Readable as any)()
    r.pipe(w)
    expect(passed).toBeTruthy()
  })
})
