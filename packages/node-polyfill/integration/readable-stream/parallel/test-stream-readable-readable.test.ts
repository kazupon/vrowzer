import { Readable } from 'readable-stream'
import { describe, expect, it } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'

describe('test-stream-readable-readable', () => {
  it('should set readable to false after destroy', () => {
    const r = new Readable({
      read() {}
    })
    expect(r.readable).toBe(true)
    r.destroy()
    expect(r.readable).toBe(false)
  })

  it('should set readable to false after end event', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read() {}
      })
      expect(r.readable).toBe(true)
      const onEnd = mustNotCall() as (...args: unknown[]) => void
      r.on('end', onEnd)
      r.resume()
      r.push(null)
      expect(r.readable).toBe(true)
      r.off('end', onEnd)
      r.on(
        'end',
        mustCall(() => {
          expect(r.readable).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should set readable to false after destroy with error', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read: mustCall(() => {
          process.nextTick(() => {
            r.destroy(new Error())
            expect(r.readable).toBe(false)
          })
        }) as (...args: unknown[]) => void as unknown as (size: number) => void
      })
      r.resume()
      r.on(
        'error',
        mustCall(() => {
          expect(r.readable).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
