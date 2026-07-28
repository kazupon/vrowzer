import { describe, it, expect } from 'vite-plus/test'
import { Readable } from 'readable-stream'

describe('test-stream-ispaused', () => {
  it('isPaused reflects stream state', () => {
    const readable = new Readable()
    readable._read = Function() as () => void

    expect(readable.isPaused()).toBe(false)

    readable.on('data', Function() as (...args: unknown[]) => void)

    expect(readable.isPaused()).toBe(false)
    readable.pause()
    expect(readable.isPaused()).toBe(true)
    readable.resume()
    expect(readable.isPaused()).toBe(false)
  })
})
