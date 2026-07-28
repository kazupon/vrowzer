import { describe, expect, it } from 'vite-plus/test'
import { isatty, ReadStream, WriteStream } from './tty.ts'

describe('isatty', () => {
  it('should return false for any fd', () => {
    expect(isatty(0)).toBe(false)
    expect(isatty(1)).toBe(false)
    expect(isatty(2)).toBe(false)
  })

  it('should return false when called without arguments', () => {
    expect(isatty()).toBe(false)
  })
})

describe('ReadStream', () => {
  it('should have isTTY set to false', () => {
    const stream = new ReadStream()
    expect(stream.isTTY).toBe(false)
  })

  it('should have setRawMode that returns this', () => {
    const stream = new ReadStream()
    expect(stream.setRawMode(true)).toBe(stream)
  })
})

describe('WriteStream', () => {
  it('should have isTTY set to false', () => {
    const stream = new WriteStream()
    expect(stream.isTTY).toBe(false)
  })

  it('should have default columns and rows', () => {
    const stream = new WriteStream()
    expect(stream.columns).toBe(80)
    expect(stream.rows).toBe(24)
  })

  it('should have getWindowSize returning [columns, rows]', () => {
    const stream = new WriteStream()
    expect(stream.getWindowSize()).toEqual([80, 24])
  })

  it('should have getColorDepth returning 1', () => {
    const stream = new WriteStream()
    expect(stream.getColorDepth()).toBe(1)
  })

  it('should have hasColors returning false', () => {
    const stream = new WriteStream()
    expect(stream.hasColors()).toBe(false)
    expect(stream.hasColors(256)).toBe(false)
  })
})
