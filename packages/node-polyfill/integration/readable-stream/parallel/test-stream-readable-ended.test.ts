import { Readable } from 'readable-stream'
import { describe, expect, it } from 'vitest'
import { mustCall, mustNotCall } from '../common/index.ts'

describe('test-stream-readable-ended', () => {
  it('should have readableEnded on prototype', () => {
    expect(Reflect.has(Readable.prototype, 'readableEnded')).toBe(true)
  })

  it('should set readableEnded after end event', () =>
    new Promise<void>(resolve => {
      const readable = new Readable()
      readable._read = () => {
        expect(readable.readableEnded).toBe(false)
        readable.push('asd')
        expect(readable.readableEnded).toBe(false)
        readable.push(null)
        expect(readable.readableEnded).toBe(false)
      }
      readable.on(
        'end',
        mustCall(() => {
          expect(readable.readableEnded).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      readable.on(
        'data',
        mustCall(() => {
          expect(readable.readableEnded).toBe(false)
        }) as (...args: unknown[]) => void
      )
    }))

  it('should not trigger error on multiple push(null)', () =>
    new Promise<void>(resolve => {
      const readable = new Readable()
      readable.on('readable', () => {
        readable.read()
      })
      readable.on('error', mustNotCall() as (...args: unknown[]) => void)
      readable.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      readable.push('a')
      readable.push(null)
      readable.push(null)
    }))
})
