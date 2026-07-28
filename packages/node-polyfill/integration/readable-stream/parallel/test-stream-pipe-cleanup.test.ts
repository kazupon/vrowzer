import { describe, it, expect } from 'vite-plus/test'
import { Stream } from 'readable-stream'

describe('test-stream-pipe-cleanup', () => {
  it('should not leave listeners hanging on source or dest', () => {
    function Writable(this: any) {
      this.writable = true
      this.endCalls = 0
      Stream.call(this)
    }
    Object.setPrototypeOf(Writable.prototype, Stream.prototype)
    Object.setPrototypeOf(Writable, Stream)
    Writable.prototype.end = function () {
      this.endCalls++
    }
    Writable.prototype.destroy = function () {
      this.endCalls++
    }

    function Readable(this: any) {
      this.readable = true
      Stream.call(this)
    }
    Object.setPrototypeOf(Readable.prototype, Stream.prototype)
    Object.setPrototypeOf(Readable, Stream)

    function Duplex(this: any) {
      this.readable = true
      Writable.call(this)
    }
    Object.setPrototypeOf(Duplex.prototype, Writable.prototype)
    Object.setPrototypeOf(Duplex, Writable)

    let i = 0
    const limit = 100
    let w: any = new (Writable as any)()
    let r: any

    for (i = 0; i < limit; i++) {
      r = new (Readable as any)()
      r.pipe(w)
      r.emit('end')
    }
    expect(r.listeners('end').length).toBe(0)
    expect(w.endCalls).toBe(limit)

    w.endCalls = 0
    for (i = 0; i < limit; i++) {
      r = new (Readable as any)()
      r.pipe(w)
      r.emit('close')
    }
    expect(r.listeners('close').length).toBe(0)
    expect(w.endCalls).toBe(limit)

    w.endCalls = 0
    r = new (Readable as any)()
    for (i = 0; i < limit; i++) {
      w = new (Writable as any)()
      r.pipe(w)
      w.emit('close')
    }
    expect(w.listeners('close').length).toBe(0)

    r = new (Readable as any)()
    w = new (Writable as any)()
    const d = new (Duplex as any)()

    r.pipe(d) // pipeline A
    d.pipe(w) // pipeline B

    expect(r.listeners('end').length).toBe(2) // A.onend, A.cleanup
    expect(r.listeners('close').length).toBe(2) // A.onclose, A.cleanup
    expect(d.listeners('end').length).toBe(2) // B.onend, B.cleanup
    // A.cleanup, B.onclose, B.cleanup
    expect(d.listeners('close').length).toBe(3)
    expect(w.listeners('end').length).toBe(0)
    expect(w.listeners('close').length).toBe(1) // B.cleanup

    r.emit('end')
    expect(d.endCalls).toBe(1)
    expect(w.endCalls).toBe(0)
    expect(r.listeners('end').length).toBe(0)
    expect(r.listeners('close').length).toBe(0)
    expect(d.listeners('end').length).toBe(2) // B.onend, B.cleanup
    expect(d.listeners('close').length).toBe(2) // B.onclose, B.cleanup
    expect(w.listeners('end').length).toBe(0)
    expect(w.listeners('close').length).toBe(1) // B.cleanup

    d.emit('end')
    expect(d.endCalls).toBe(1)
    expect(w.endCalls).toBe(1)
    expect(r.listeners('end').length).toBe(0)
    expect(r.listeners('close').length).toBe(0)
    expect(d.listeners('end').length).toBe(0)
    expect(d.listeners('close').length).toBe(0)
    expect(w.listeners('end').length).toBe(0)
    expect(w.listeners('close').length).toBe(0)
  })
})
