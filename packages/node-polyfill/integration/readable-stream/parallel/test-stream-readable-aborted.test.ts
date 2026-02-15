import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable, Duplex } from 'readable-stream'

describe('test-stream-readable-aborted', () => {
  it('should set readableAborted after destroy without data', () => {
    const readable = new Readable({
      read() {}
    })
    expect(readable.readableAborted).toBe(false)
    readable.destroy()
    expect(readable.readableAborted).toBe(true)
  })

  it('should set readableAborted after push(null) then destroy', () => {
    const readable = new Readable({
      read() {}
    })
    expect(readable.readableAborted).toBe(false)
    readable.push(null)
    readable.destroy()
    expect(readable.readableAborted).toBe(true)
  })

  it('should set readableAborted after push data then destroy', () => {
    const readable = new Readable({
      read() {}
    })
    expect(readable.readableAborted).toBe(false)
    readable.push('asd')
    readable.destroy()
    expect(readable.readableAborted).toBe(true)
  })

  it('should not set readableAborted after full consume and destroy', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        read() {}
      })
      expect(readable.readableAborted).toBe(false)
      readable.push('asd')
      readable.push(null)
      expect(readable.readableAborted).toBe(false)
      readable.on(
        'end',
        mustCall(() => {
          expect(readable.readableAborted).toBe(false)
          readable.destroy()
          expect(readable.readableAborted).toBe(false)
          queueMicrotask(() => {
            expect(readable.readableAborted).toBe(false)
            resolve()
          })
        }) as (...args: unknown[]) => void
      )
      readable.resume()
    }))

  it('should not set readableAborted for duplex with readable false', () => {
    const duplex = new Duplex({
      readable: false,
      write() {}
    })
    duplex.destroy()
    expect(duplex.readableAborted).toBe(false)
  })
})
