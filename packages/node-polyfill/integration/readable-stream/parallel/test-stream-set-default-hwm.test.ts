import { describe, it, expect } from 'vitest'
import { Writable, Readable, Transform } from 'readable-stream'

// @ts-ignore - exists at runtime but not in types
const { setDefaultHighWaterMark, getDefaultHighWaterMark } = require('readable-stream') as {
  setDefaultHighWaterMark: (objectMode: boolean, size: number) => void
  getDefaultHighWaterMark: (objectMode: boolean) => number
}

describe('test-stream-set-default-hwm', () => {
  it('should set and get default high water mark for non-object mode', () => {
    expect(getDefaultHighWaterMark(false)).not.toBe(32 * 1000)
    setDefaultHighWaterMark(false, 32 * 1000)
    expect(getDefaultHighWaterMark(false)).toBe(32 * 1000)
  })

  it('should set and get default high water mark for object mode', () => {
    expect(getDefaultHighWaterMark(true)).not.toBe(32)
    setDefaultHighWaterMark(true, 32)
    expect(getDefaultHighWaterMark(true)).toBe(32)
  })

  it('should apply default hwm to new Writable', () => {
    setDefaultHighWaterMark(false, 32 * 1000)
    const w = new Writable({
      write() {}
    })
    expect(w.writableHighWaterMark).toBe(32 * 1000)
  })

  it('should apply default hwm to new Readable', () => {
    setDefaultHighWaterMark(false, 32 * 1000)
    const r = new Readable({
      read() {}
    })
    expect(r.readableHighWaterMark).toBe(32 * 1000)
  })

  it('should apply default hwm to new Transform', () => {
    setDefaultHighWaterMark(false, 32 * 1000)
    const t = new Transform({
      transform() {}
    })
    expect(t.writableHighWaterMark).toBe(32 * 1000)
    expect(t.readableHighWaterMark).toBe(32 * 1000)
  })
})
