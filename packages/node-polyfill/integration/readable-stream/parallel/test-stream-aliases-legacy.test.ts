import { describe, it, expect } from 'vite-plus/test'
import stream, { Readable, Writable, Duplex, Transform, PassThrough } from 'readable-stream'

describe('test-stream-aliases-legacy', () => {
  it('stream.Readable is Readable', () => {
    expect(stream.Readable).toBe(Readable)
  })

  it('stream.Writable is Writable', () => {
    expect(stream.Writable).toBe(Writable)
  })

  it('stream.Duplex is Duplex', () => {
    expect(stream.Duplex).toBe(Duplex)
  })

  it('stream.Transform is Transform', () => {
    expect(stream.Transform).toBe(Transform)
  })

  it('stream.PassThrough is PassThrough', () => {
    expect(stream.PassThrough).toBe(PassThrough)
  })
})
