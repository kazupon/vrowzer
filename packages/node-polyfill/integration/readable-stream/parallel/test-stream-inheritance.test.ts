import { describe, it, expect } from 'vitest'
import { Readable, Writable, Duplex, Transform } from 'readable-stream'

describe('test-stream-inheritance', () => {
  it('instanceof checks for all stream types', () => {
    const readable = new Readable({
      read() {}
    })
    const writable = new Writable({
      write() {}
    })
    const duplex = new Duplex({
      read() {},
      write() {}
    })
    const transform = new Transform({
      transform() {}
    })

    expect(readable instanceof Readable).toBeTruthy()
    expect(!(writable instanceof Readable)).toBeTruthy()
    expect(duplex instanceof Readable).toBeTruthy()
    expect(transform instanceof Readable).toBeTruthy()

    expect(!(readable instanceof Writable)).toBeTruthy()
    expect(writable instanceof Writable).toBeTruthy()
    expect(duplex instanceof Writable).toBeTruthy()
    expect(transform instanceof Writable).toBeTruthy()

    expect(!(readable instanceof Duplex)).toBeTruthy()
    expect(!(writable instanceof Duplex)).toBeTruthy()
    expect(duplex instanceof Duplex).toBeTruthy()
    expect(transform instanceof Duplex).toBeTruthy()

    expect(!(readable instanceof Transform)).toBeTruthy()
    expect(!(writable instanceof Transform)).toBeTruthy()
    expect(!(duplex instanceof Transform)).toBeTruthy()
    expect(transform instanceof Transform).toBeTruthy()

    // @ts-ignore - testing instanceof with null
    expect(!(null instanceof Writable)).toBeTruthy()
    expect(!((undefined as any) instanceof Writable)).toBeTruthy()
  })

  it('simple inheritance check for Writable works in subclass constructor', () => {
    function CustomWritable(this: any) {
      expect(this instanceof CustomWritable).toBeTruthy()
      expect(this instanceof Writable).toBeTruthy()
    }
    Object.setPrototypeOf(CustomWritable, Writable)
    Object.setPrototypeOf(CustomWritable.prototype, Writable.prototype)
    ;new (CustomWritable as any)()

    expect(() => (CustomWritable as any)()).toThrow()

    class OtherCustomWritable extends Writable {}
    expect(!(new OtherCustomWritable() instanceof CustomWritable)).toBeTruthy()
    expect(!(new (CustomWritable as any)() instanceof OtherCustomWritable)).toBeTruthy()
  })
})
