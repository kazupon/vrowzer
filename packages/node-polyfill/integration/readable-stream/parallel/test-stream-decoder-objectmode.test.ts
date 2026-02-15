import { describe, it, expect } from 'vitest'
import { Readable } from 'readable-stream'

describe('test-stream-decoder-objectmode', () => {
  it('should not concatenate chunks in objectMode with encoding', () => {
    const readable = new Readable({
      read: () => {},
      encoding: 'utf16le',
      objectMode: true
    })
    readable.push(Buffer.from('abc', 'utf16le'))
    readable.push(Buffer.from('def', 'utf16le'))
    readable.push(null)

    // Without object mode, these would be concatenated into a single chunk.
    expect(readable.read()).toBe('abc')
    expect(readable.read()).toBe('def')
    expect(readable.read()).toBe(null)
  })
})
