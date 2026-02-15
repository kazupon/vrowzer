import { describe, it, expect } from 'vitest'
import { Writable } from 'readable-stream'

describe('test-stream-writable-aborted', () => {
  it('should set writableAborted after destroy without end', () => {
    const writable = new Writable({
      write() {}
    })
    expect(writable.writableAborted).toBe(false)
    writable.destroy()
    expect(writable.writableAborted).toBe(true)
  })

  it('should set writableAborted after end then destroy', () => {
    const writable = new Writable({
      write() {}
    })
    expect(writable.writableAborted).toBe(false)
    writable.end()
    writable.destroy()
    expect(writable.writableAborted).toBe(true)
  })
})
