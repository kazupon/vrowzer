import { describe, it, expect } from 'vitest'
import { Readable } from 'readable-stream'

describe('test-stream-readable-setEncoding-null', () => {
  it('setEncoding(null) should set encoding to utf8', () => {
    const readable = new Readable({
      encoding: 'hex'
    })
    expect((readable as any)._readableState.encoding).toBe('hex')
    readable.setEncoding(null as unknown as string)
    expect((readable as any)._readableState.encoding).toBe('utf8')
  })
})
