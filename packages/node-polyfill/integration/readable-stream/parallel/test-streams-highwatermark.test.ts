import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-streams-highwatermark', () => {
  it('should handle highWaterMark exceeding 32 bit range', () => {
    // This number exceeds the range of 32 bit integer arithmetic but should still
    // be handled correctly.
    const ovfl = Number.MAX_SAFE_INTEGER
    const readable = new Readable({
      highWaterMark: ovfl
    })
    expect(
      (readable as unknown as { _readableState: { highWaterMark: number } })._readableState
        .highWaterMark
    ).toBe(ovfl)
    const writable = new Writable({
      highWaterMark: ovfl
    })
    expect(
      (writable as unknown as { _writableState: { highWaterMark: number } })._writableState
        .highWaterMark
    ).toBe(ovfl)
  })

  it('should reject invalid highWaterMark values', () => {
    for (const invalidHwm of [true, false, '5', {}, -5, NaN]) {
      for (const type of [Readable, Writable]) {
        expect(() => {
          new type({
            // @ts-ignore - testing invalid values
            highWaterMark: invalidHwm
          })
        }).toThrow()
      }
    }
  })

  it('should handle highWaterMark and state.length both zero for push', () => {
    const readable = new Readable({
      highWaterMark: 0
    })
    for (let i = 0; i < 3; i++) {
      // @ts-ignore - push() with no args is valid at runtime
      const needMoreData = readable.push()
      expect(needMoreData).toBe(true)
    }
  })

  it('should handle read(0) with highWaterMark 0', () => {
    const readable = new Readable({
      highWaterMark: 0
    })
    readable._read = mustCall() as () => void
    readable.read(0)
  })

  it('should parse size as decimal integer', () => {
    ;['1', '1.0', 1].forEach(size => {
      const readable = new Readable({
        read: mustCall() as () => void,
        highWaterMark: 0
      })
      readable.read(size as unknown as number)
      expect(
        (readable as unknown as { _readableState: { highWaterMark: number } })._readableState
          .highWaterMark
      ).toBe(Number(size))
    })
  })

  it('should throw for highwatermark limit', () => {
    const hwm = 0x40000000 + 1
    const readable = new Readable({
      read() {}
    })
    expect(() => readable.read(hwm)).toThrow()
  })
})
