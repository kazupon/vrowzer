import { Duplex } from 'readable-stream'
import { describe, expect, it } from 'vitest'

describe('test-stream-duplex-props', () => {
  it('should set objectMode and highWaterMark for both sides', () => {
    const d = new Duplex({
      objectMode: true,
      highWaterMark: 100
    })
    expect(d.writableObjectMode).toBe(true)
    expect(d.writableHighWaterMark).toBe(100)
    expect(d.readableObjectMode).toBe(true)
    expect(d.readableHighWaterMark).toBe(100)
  })

  it('should set different objectMode and highWaterMark for each side', () => {
    const d = new Duplex({
      readableObjectMode: false,
      readableHighWaterMark: 10,
      writableObjectMode: true,
      writableHighWaterMark: 100
    })
    expect(d.writableObjectMode).toBe(true)
    expect(d.writableHighWaterMark).toBe(100)
    expect(d.readableObjectMode).toBe(false)
    expect(d.readableHighWaterMark).toBe(10)
  })
})
