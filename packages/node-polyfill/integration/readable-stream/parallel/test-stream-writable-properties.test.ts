import { describe, it, expect } from 'vitest'
import { Writable } from 'readable-stream'

describe('test-stream-writable-properties', () => {
  it('writableCorked increments and decrements correctly', () => {
    const w = new Writable()
    expect(w.writableCorked).toBe(0)
    w.uncork()
    expect(w.writableCorked).toBe(0)
    w.cork()
    expect(w.writableCorked).toBe(1)
    w.cork()
    expect(w.writableCorked).toBe(2)
    w.uncork()
    expect(w.writableCorked).toBe(1)
    w.uncork()
    expect(w.writableCorked).toBe(0)
    w.uncork()
    expect(w.writableCorked).toBe(0)
  })
})
